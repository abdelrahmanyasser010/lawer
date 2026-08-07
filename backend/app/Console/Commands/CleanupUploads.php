<?php
namespace App\Console\Commands;
use App\Services\PrivateStorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
final class CleanupUploads extends Command
{
    protected $signature='zdraft:cleanup-uploads {--hours=24} {--limit=500}';protected $description='Remove stale unlinked uploads and their image variants';
    public function __construct(private PrivateStorageService $storage){parent::__construct();}
    public function handle():int{$hours=max(1,(int)$this->option('hours'));$limit=max(1,min(2000,(int)$this->option('limit')));$rows=DB::select("SELECT id,storage_key,file_path,thumbnail_storage_key,thumbnail_file_path,original_storage_key,original_file_path FROM document_attachments WHERE attachable_type='pending' AND created_at<CURRENT_TIMESTAMP-(?::text || ' hours')::interval ORDER BY id LIMIT ?",[$hours,$limit]);$removed=0;foreach($rows as$f){try{foreach([[$f->storage_key,$f->file_path],[$f->thumbnail_storage_key,$f->thumbnail_file_path],[$f->original_storage_key,$f->original_file_path]]as[$key,$path]){if($key)$this->storage->delete($key);elseif($path&&is_file($path))@unlink($path);}$removed+=DB::table('document_attachments')->where('id',$f->id)->where('attachable_type','pending')->delete();}catch(\Throwable$e){$this->error("Attachment {$f->id}: {$e->getMessage()}");}}$this->info("Removed {$removed} stale upload(s).");return self::SUCCESS;}
}
