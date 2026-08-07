<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\FileSecurityService;
use App\Services\ImagePipelineService;
use App\Services\PrivateStorageService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class AttachmentController extends Controller
{
    use ApiResponse;
    public function __construct(private FileSecurityService $security, private ImagePipelineService $images, private PrivateStorageService $storage, private AuditService $audit) {}
    public function upload(Request $request)
    {
        $request->validate(['file' => ['required','file','max:20480']]);
        $file=$request->file('file'); if(!$file||!$file->isValid()) throw new ApiException(400,'الملف مطلوب أو نوعه غير مسموح','UPLOAD_REQUIRED');
        $detected=$this->security->inspect($file->getRealPath(),$file->getClientMimeType(),$file->getClientOriginalName());
        $processed=$this->images->process($file->getRealPath(),$detected,$file->getClientOriginalName());
        $uid=$request->attributes->get('auth_user')['id'];$prefix='user-'.$uid;
        $key=$this->storage->key($prefix,$processed['canonicalName'],$processed['isImage']?'webp':null);
        $stored=$this->storage->put($key,$processed['canonicalBytes']);
        $thumb=null;$original=null;
        try{
            if($processed['thumbnail']){$thumbKey=$this->storage->key($prefix.'/thumbnails',$processed['thumbnail']['name'],'webp');$thumb=$this->storage->put($thumbKey,$processed['thumbnail']['bytes']);}
            if($processed['isImage']&&config('zdraft.image.preserve_original')){$originalKey=$this->storage->key($prefix.'/originals',$file->getClientOriginalName());$raw=file_get_contents($file->getRealPath());$original=$this->storage->put($originalKey,$raw===false?'':$raw);}
            $originalName=mb_substr(basename($file->getClientOriginalName()),0,255)?:'attachment';
            $row=DB::selectOne("INSERT INTO document_attachments (attachable_type,attachable_id,owner_user_id,file_path,storage_key,storage_driver,file_name,file_type,file_size_bytes,content_hash,visibility,scan_status,scan_engine,scanned_at,is_compressed,display_order,original_file_name,source_file_type,source_file_size_bytes,source_content_hash,image_width,image_height,metadata_stripped,processing_version,processed_at,thumbnail_file_path,thumbnail_storage_key,thumbnail_file_type,thumbnail_file_size_bytes,thumbnail_content_hash,original_file_path,original_storage_key,original_storage_driver) VALUES ('pending',0,?,?,?,?,?,?,?,?, 'private','clean',?,CURRENT_TIMESTAMP,?,1,?,?,?,?,?,?,?,?,CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,?,?,?,?,?,?,?,?) RETURNING id",[
                $uid,$this->storage->path($key),$key,'local',$processed['canonicalName'],$processed['canonicalMime'],$stored['sizeBytes'],$stored['sha256'],'fileinfo'.(config('zdraft.clamav.enabled')?'+clamav':''),$processed['isCompressed'],$originalName,$processed['originalMime'],$processed['originalSizeBytes'],$processed['originalSha256'],$processed['width'],$processed['height'],$processed['metadataStripped'],$processed['processingVersion'],$processed['processingVersion'],$thumb?$this->storage->path($thumb['key']):null,$thumb['key']??null,$processed['thumbnail']['mime']??null,$thumb['sizeBytes']??null,$thumb['sha256']??null,$original?$this->storage->path($original['key']):null,$original['key']??null,$original?'local':null
            ]);
            $id=(int)$row->id;
            $this->audit->write($request,$processed['isImage']?'attachment.image_processed':'attachment.uploaded','attachment',$id,null,['originalFileName'=>$originalName,'storedFileName'=>$processed['canonicalName'],'sourceMime'=>$processed['originalMime'],'storedMime'=>$processed['canonicalMime'],'sourceSize'=>$processed['originalSizeBytes'],'storedSize'=>$stored['sizeBytes'],'sourceHash'=>$processed['originalSha256'],'storedHash'=>$stored['sha256'],'metadataStripped'=>$processed['metadataStripped'],'thumbnailCreated'=>(bool)$thumb,'originalPreserved'=>(bool)$original,'scanStatus'=>'clean','storageDriver'=>'local']);
            return $this->created($request,['id'=>$id,'fileName'=>$processed['canonicalName'],'originalFileName'=>$originalName,'mimeType'=>$processed['canonicalMime'],'originalMimeType'=>$processed['originalMime'],'sizeBytes'=>$stored['sizeBytes'],'originalSizeBytes'=>$processed['originalSizeBytes'],'hash'=>$stored['sha256'],'originalHash'=>$processed['originalSha256'],'scanStatus'=>'clean','isImage'=>$processed['isImage'],'isCompressed'=>$processed['isCompressed'],'metadataStripped'=>$processed['metadataStripped'],'width'=>$processed['width'],'height'=>$processed['height'],'thumbnailAvailable'=>(bool)$thumb,'thumbnailUrl'=>$thumb?"/api/v1/attachments/{$id}/thumbnail":null],$processed['isImage']?'تمت معالجة الصورة وحفظها في التخزين الخاص':'تم رفع الملف إلى التخزين الخاص');
        }catch(\Throwable $e){$this->storage->delete($key);$this->storage->delete($thumb['key']??null);$this->storage->delete($original['key']??null);throw$e;}
    }
    public function show(Request $request,int $id)
    {
        $file=DB::table('document_attachments')->where('id',$id)->first();if(!$file)throw new ApiException(404,'الملف غير موجود');$this->authorizeFile($request,$file);
        return $this->ok($request,['id'=>$file->id,'fileName'=>$file->file_name,'originalFileName'=>$file->original_file_name?:$file->file_name,'mimeType'=>$file->file_type,'originalMimeType'=>$file->source_file_type?:$file->file_type,'sizeBytes'=>(int)$file->file_size_bytes,'originalSizeBytes'=>(int)($file->source_file_size_bytes?:$file->file_size_bytes),'hash'=>$file->content_hash,'originalHash'=>$file->source_content_hash?:$file->content_hash,'attachableType'=>$file->attachable_type,'attachableId'=>(int)$file->attachable_id,'scanStatus'=>$file->scan_status,'isCompressed'=>(bool)$file->is_compressed,'metadataStripped'=>(bool)$file->metadata_stripped,'width'=>$file->image_width,'height'=>$file->image_height,'thumbnailAvailable'=>(bool)$file->thumbnail_storage_key,'thumbnailUrl'=>$file->thumbnail_storage_key?"/api/v1/attachments/{$file->id}/thumbnail":null,'createdAt'=>$file->created_at]);
    }
    public function link(Request $request,int $id)
    {
        $data=$request->validate(['attachableType'=>['required','in:contract,service_request,payment'],'attachableId'=>['required','integer','min:1']]);
        if(!$this->canAccessTarget($request,$data['attachableType'],$data['attachableId']))throw new ApiException(403,'ليس لديك صلاحية ربط ملف بهذا السجل');
        $updated=DB::table('document_attachments')->where('id',$id)->where('owner_user_id',$request->attributes->get('auth_user')['id'])->where('attachable_type','pending')->update(['attachable_type'=>$data['attachableType'],'attachable_id'=>$data['attachableId']]);
        if(!$updated)throw new ApiException(404,'الملف غير موجود أو تم ربطه بالفعل');
        return $this->ok($request,['id'=>$id]+$data,'تم ربط الملف');
    }
    public function delete(Request $request,int $id)
    {
        $uid=$request->attributes->get('auth_user')['id'];$file=DB::table('document_attachments')->where('id',$id)->where('owner_user_id',$uid)->where('attachable_type','pending')->first();if(!$file)throw new ApiException(404,'الملف غير موجود أو لم يعد ملفًا مؤقتًا');
        $this->storage->delete($file->storage_key);$this->storage->delete($file->thumbnail_storage_key);$this->storage->delete($file->original_storage_key);DB::table('document_attachments')->where('id',$id)->where('owner_user_id',$uid)->where('attachable_type','pending')->delete();$this->audit->write($request,'attachment.deleted_pending','attachment',$id);
        return $this->ok($request,['id'=>$id,'deleted'=>true],'تم حذف الملف المؤقت');
    }
    public function thumbnail(Request $request,int $id)
    {
        $file=DB::table('document_attachments')->where('id',$id)->first();if(!$file)throw new ApiException(404,'الملف غير موجود');$this->authorizeFile($request,$file);if(!$file->thumbnail_storage_key&&!$file->thumbnail_file_path)throw new ApiException(404,'لا توجد معاينة لهذا الملف','THUMBNAIL_NOT_AVAILABLE');$path=$file->thumbnail_storage_key?$this->storage->path($file->thumbnail_storage_key):$file->thumbnail_file_path;if(!is_file($path))throw new ApiException(404,'المعاينة غير موجودة في التخزين','THUMBNAIL_MISSING');return response()->file($path,['Content-Type'=>$file->thumbnail_file_type?:'image/webp','Content-Disposition'=>'inline','Cache-Control'=>'private, max-age=86400']);
    }
    public function download(Request $request,int $id)
    {
        $file=DB::table('document_attachments')->where('id',$id)->first();if(!$file)throw new ApiException(404,'الملف غير موجود');$this->authorizeFile($request,$file);$path=$file->storage_key?$this->storage->path($file->storage_key):$file->file_path;if(!is_file($path))throw new ApiException(404,'الملف غير موجود في التخزين','STORED_FILE_MISSING');return response()->download($path,$file->file_name,['Content-Type'=>$file->file_type]);
    }
    private function authorizeFile(Request $request,object $file):void{if((int)$file->owner_user_id===$request->attributes->get('auth_user')['id']||$this->canAccessTarget($request,$file->attachable_type,(int)$file->attachable_id,(int)$file->owner_user_id,$file->visibility))return;throw new ApiException(403,'ليس لديك صلاحية الوصول إلى الملف');}
    private function canAccessTarget(Request $request,string $type,int $id,?int $owner=null,?string $visibility=null):bool
    {
        $auth=$request->attributes->get('auth_user');if(in_array('super_admin',$auth['roles']??[],true)||in_array('attachments.view_all',$auth['permissions']??[],true))return true;
        if($type==='contract')return DB::table('contracts')->where('id',$id)->whereNull('deleted_at')->where(fn($q)=>$q->where('user_id',$auth['id'])->orWhere('client_user_id',$auth['id'])->orWhere('created_by_user_id',$auth['id'])->orWhere('assigned_lawyer_id',$auth['id']))->exists();
        if($type==='service_request'){$r=DB::table('service_requests')->where('id',$id)->first();if(!$r)return false;if((int)$r->assigned_lawyer_id===$auth['id'])return true;if((int)$r->client_user_id===$auth['id'])return$owner===$auth['id']||$visibility==='client';return false;}
        if($type==='payment')return in_array('payments.review',$auth['permissions']??[],true)||DB::table('payments')->where('id',$id)->where('user_id',$auth['id'])->exists();return false;
    }
}
