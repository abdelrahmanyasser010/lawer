<?php
namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\ContractPricingService;
use App\Services\TemplateEngineService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class TemplateController extends Controller
{
    use ApiResponse;
    public function __construct(private AuditService $audit,private ContractPricingService $pricing,private TemplateEngineService $engine) {}

    public function index(Request $request)
    {
        $rows = DB::select("SELECT ct.id,ct.slug,ct.name_ar AS \"nameAr\",ct.description,0::float AS \"priceEgp\",tv.version_number AS version,jsonb_array_length(COALESCE(tv.definition_json->'variants','[]'::jsonb)) AS \"variantsCount\",cat.slug AS \"categorySlug\",cat.name_ar AS \"categoryNameAr\",cat.description AS \"categoryDescription\" FROM contract_templates ct LEFT JOIN contract_template_categories cat ON cat.id=ct.category_id LEFT JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.is_active=TRUE AND tv.status='published' ORDER BY COALESCE(cat.sort_order,0),ct.id");
        return $this->ok($request, $rows);
    }

    public function publicDefinition(Request $request, string $slug)
    {
        $row = DB::selectOne("SELECT tv.definition_json FROM contract_templates ct JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.slug=? AND ct.is_active=TRUE AND tv.status='published'", [$slug]);
        if (!$row) throw new ApiException(404, 'القالب المنشور غير موجود', 'TEMPLATE_NOT_PUBLISHED');
        $definition = is_string($row->definition_json) ? json_decode($row->definition_json, true) : (array) $row->definition_json;
        $definition['priceEgp'] = 0.0; // Legacy family price is intentionally not used for customer pricing.
        $definition['variantPricing'] = $this->pricing->forDefinition($slug,$definition);
        return $this->ok($request, $definition);
    }

    public function adminIndex(Request $request)
    {
        $rows = DB::select("SELECT ct.id,ct.slug,ct.name_ar AS \"nameAr\",ct.description,ct.is_active AS \"isActive\",ct.current_published_version_id AS \"currentPublishedVersionId\",ct.category_id AS \"categoryId\",cat.slug AS \"categorySlug\",cat.name_ar AS \"categoryNameAr\",cat.description AS \"categoryDescription\" FROM contract_templates ct LEFT JOIN contract_template_categories cat ON cat.id=ct.category_id ORDER BY COALESCE(cat.sort_order,0),ct.id");
        $payload=[];
        foreach($rows as$row){
            $versions=DB::select('SELECT id,version_number AS "versionNumber",status,change_summary AS "changeSummary",legal_reference AS "legalReference",created_at AS "createdAt",published_at AS "publishedAt" FROM template_versions WHERE template_id=? ORDER BY version_number DESC',[$row->id]);
            $published=$row->currentPublishedVersionId?DB::selectOne('SELECT definition_json FROM template_versions WHERE id=?',[$row->currentPublishedVersionId]):null;
            $definition=$published?(is_string($published->definition_json)?json_decode($published->definition_json,true):(array)$published->definition_json):[];
            $pricing=$this->pricing->forDefinition((string)$row->slug,$definition);
            $variants=[];foreach($definition['variants']??[] as$variant){$key=(string)($variant['key']??'');if($key==='')continue;$p=$pricing[$key]??['selfServicePriceEgp'=>0.0,'lawyerAssistedPriceEgp'=>0.0];$variants[]=['key'=>$key,'nameAr'=>(string)($variant['nameAr']??$key),'description'=>(string)($variant['description']??''),'selfServicePriceEgp'=>(float)$p['selfServicePriceEgp'],'lawyerAssistedPriceEgp'=>(float)$p['lawyerAssistedPriceEgp']];}
            $payload[]=['id'=>(int)$row->id,'slug'=>(string)$row->slug,'nameAr'=>(string)$row->nameAr,'description'=>(string)$row->description,'priceEgp'=>0.0,'isActive'=>(bool)$row->isActive,'categoryId'=>$row->categoryId?(int)$row->categoryId:null,'categorySlug'=>$row->categorySlug?(string)$row->categorySlug:null,'categoryNameAr'=>$row->categoryNameAr?(string)$row->categoryNameAr:null,'categoryDescription'=>$row->categoryDescription?(string)$row->categoryDescription:null,'currentPublishedVersionId'=>$row->currentPublishedVersionId?(int)$row->currentPublishedVersionId:null,'version'=>$definition?(int)($definition['version']??($versions[0]->versionNumber??0)):0,'variantsCount'=>count($variants),'variants'=>$variants,'versions'=>$versions];
        }
        return $this->ok($request,$payload);
    }

    public function adminCategories(Request $request)
    {
        $rows = DB::select('SELECT c.id,c.slug,c.name_ar AS "nameAr",c.description,c.is_active AS "isActive",c.sort_order AS "sortOrder",COUNT(ct.id)::int AS "templatesCount" FROM contract_template_categories c LEFT JOIN contract_templates ct ON ct.category_id=c.id GROUP BY c.id ORDER BY c.sort_order,c.id');
        return $this->ok($request, $rows);
    }

    public function adminCreateCategory(Request $request)
    {
        $data=$request->validate(['slug'=>['required','string','max:80','regex:/^[a-z0-9_]+$/'],'nameAr'=>['required','string','max:150'],'description'=>['nullable','string','max:2000'],'sortOrder'=>['nullable','integer','min:0','max:100000']]);
        if(DB::table('contract_template_categories')->where('slug',$data['slug'])->exists())throw new ApiException(409,'رمز التصنيف مستخدم بالفعل','TEMPLATE_CATEGORY_SLUG_EXISTS');
        $id=(int)DB::table('contract_template_categories')->insertGetId(['slug'=>$data['slug'],'name_ar'=>$data['nameAr'],'description'=>$data['description']??'','sort_order'=>$data['sortOrder']??0,'is_active'=>true,'created_at'=>now(),'updated_at'=>now()]);
        $this->audit->write($request,'template.category_created','contract_template_category',$id,null,$data);
        return $this->created($request,['id'=>$id,'slug'=>$data['slug'],'nameAr'=>$data['nameAr']],'تم إنشاء تصنيف العقود');
    }

    public function adminUpdateCategory(Request $request,int $categoryId)
    {
        $data=$request->validate(['slug'=>['sometimes','string','max:80','regex:/^[a-z0-9_]+$/'],'nameAr'=>['sometimes','string','max:150'],'description'=>['sometimes','string','max:2000'],'sortOrder'=>['sometimes','integer','min:0','max:100000'],'isActive'=>['sometimes','boolean']]);
        $category=DB::table('contract_template_categories')->where('id',$categoryId)->first();
        if(!$category)throw new ApiException(404,'تصنيف العقود غير موجود');
        if(isset($data['slug'])&&DB::table('contract_template_categories')->where('slug',$data['slug'])->where('id','<>',$categoryId)->exists())throw new ApiException(409,'رمز التصنيف مستخدم بالفعل','TEMPLATE_CATEGORY_SLUG_EXISTS');
        $updates=[];foreach(['slug'=>'slug','nameAr'=>'name_ar','description'=>'description','sortOrder'=>'sort_order','isActive'=>'is_active'] as $input=>$column)if(array_key_exists($input,$data))$updates[$column]=$data[$input];
        if($updates){$updates['updated_at']=now();DB::table('contract_template_categories')->where('id',$categoryId)->update($updates);$this->audit->write($request,'template.category_updated','contract_template_category',$categoryId,null,$data);}
        return $this->ok($request,['id'=>$categoryId]+$data,'تم تحديث تصنيف العقود');
    }

    public function adminCreate(Request $request)
    {
        $data=$request->validate(['slug'=>['required','string','max:80','regex:/^[a-z0-9_]+$/'],'nameAr'=>['required','string','max:150'],'description'=>['nullable','string','max:2000'],'priceEgp'=>['nullable','numeric','min:0','max:1000000'],'categoryId'=>['nullable','integer','exists:contract_template_categories,id'],'sourceTemplateId'=>['nullable','integer','exists:contract_templates,id'],'sourceVersionId'=>['nullable','integer']]);
        $actor=(int)($request->attributes->get('auth_user')['id']??0);
        $result=DB::transaction(function()use($request,$data,$actor){
            if(DB::table('contract_templates')->where('slug',$data['slug'])->exists())throw new ApiException(409,'رمز القالب مستخدم بالفعل','TEMPLATE_SLUG_EXISTS');
            $source=null;
            if(!empty($data['sourceTemplateId'])){
                $sourceId=(int)$data['sourceTemplateId'];
                $sourceVersionId=$data['sourceVersionId']??null;
                $source=$sourceVersionId
                    ? DB::selectOne('SELECT tv.* FROM template_versions tv WHERE tv.id=? AND tv.template_id=?',[(int)$sourceVersionId,$sourceId])
                    : DB::selectOne("SELECT tv.* FROM template_versions tv WHERE tv.template_id=? ORDER BY CASE WHEN tv.status='published' THEN 0 ELSE 1 END,tv.version_number DESC LIMIT 1",[$sourceId]);
                if(!$source)throw new ApiException(404,'إصدار القالب المصدر غير موجود','SOURCE_TEMPLATE_VERSION_NOT_FOUND');
            }
            $sourceDefinition=$source?$this->definition($source->definition_json):[];
            $categoryId=$data['categoryId']??($source?DB::table('contract_templates')->where('id',(int)$data['sourceTemplateId'])->value('category_id'):null);
            $templateId=(int)DB::table('contract_templates')->insertGetId(['name'=>$data['nameAr'],'name_ar'=>$data['nameAr'],'slug'=>$data['slug'],'description'=>$data['description']??'','price_egp'=>$data['priceEgp']??0,'is_active'=>true,'template_version'=>1,'updated_at'=>now()]);
            DB::table('contract_templates')->where('id',$templateId)->update(['category_id'=>$categoryId]);
            $definition=$sourceDefinition?:['slug'=>$data['slug'],'version'=>1,'nameAr'=>$data['nameAr'],'description'=>$data['description']??'','priceEgp'=>0,'variants'=>[],'optionalClauses'=>[],'legalClauses'=>[]];
            $definition['slug']=$data['slug'];$definition['version']=1;$definition['nameAr']=$data['nameAr'];$definition['description']=$data['description']??($definition['description']??'');$definition['priceEgp']=0;
            $versionId=(int)DB::table('template_versions')->insertGetId(['template_id'=>$templateId,'version_number'=>1,'status'=>'draft','definition_json'=>json_encode($definition,JSON_UNESCAPED_UNICODE),'change_summary'=>'إنشاء قالب جديد','created_by'=>$actor,'created_at'=>now(),'updated_at'=>now()]);
            $this->audit->write($request,'template.created','contract_template',$templateId,null,['versionId'=>$versionId,'slug'=>$data['slug'],'categoryId'=>$categoryId,'sourceTemplateId'=>$data['sourceTemplateId']??null,'sourceVersionId'=>$source?((int)$source->id):null]);
            return ['id'=>$templateId,'versionId'=>$versionId,'status'=>'draft'];
        });
        return $this->created($request,$result,'تم إنشاء مسودة القالب');
    }

    public function adminVersion(Request $request,int $versionId)
    {
        $row=$this->versionRow($versionId);$definition=$this->definition($row->definition_json);
        return $this->ok($request,['id'=>(int)$row->id,'templateId'=>(int)$row->template_id,'versionNumber'=>(int)$row->version_number,'status'=>(string)$row->status,'definition'=>$definition,'changeSummary'=>$row->change_summary,'legalReference'=>$row->legal_reference,'effectiveFrom'=>$row->effective_from,'createdAt'=>$row->created_at,'publishedAt'=>$row->published_at]);
    }

    public function adminClone(Request $request,int $templateId)
    {
        $data=$request->validate(['sourceVersionId'=>['nullable','integer'],'changeSummary'=>['nullable','string','max:2000']]);$sourceId=$data['sourceVersionId']??null;
        $source=$sourceId?DB::selectOne('SELECT * FROM template_versions WHERE id=? AND template_id=?',[$sourceId,$templateId]):DB::selectOne('SELECT * FROM template_versions WHERE template_id=? ORDER BY version_number DESC LIMIT 1',[$templateId]);
        if(!$source)throw new ApiException(404,'الإصدار المصدر غير موجود');
        $definition=$this->definition($source->definition_json);$next=(int)DB::selectOne('SELECT COALESCE(MAX(version_number),0)+1 AS next FROM template_versions WHERE template_id=?',[$templateId])->next;$definition['version']=$next;$actor=(int)($request->attributes->get('auth_user')['id']??0);
        $id=(int)DB::table('template_versions')->insertGetId(['template_id'=>$templateId,'version_number'=>$next,'status'=>'draft','definition_json'=>json_encode($definition,JSON_UNESCAPED_UNICODE),'change_summary'=>$data['changeSummary']??'نسخة جديدة من إصدار سابق','created_by'=>$actor,'created_at'=>now(),'updated_at'=>now()]);
        $this->audit->write($request,'template.version_cloned','template_version',$id,null,['templateId'=>$templateId,'sourceVersionId'=>(int)$source->id,'versionNumber'=>$next]);
        return $this->created($request,['id'=>$id,'templateId'=>$templateId,'versionNumber'=>$next,'status'=>'draft'],'تم إنشاء مسودة إصدار جديدة');
    }

    public function adminValidation(Request $request,int $versionId)
    {
        $row=$this->versionRow($versionId);$definition=$this->definition($row->definition_json);$errors=[];$warnings=[];$variants=$definition['variants']??[];$clauses=$definition['legalClauses']??[];$known=array_fill_keys(array_map(fn($c)=>(string)($c['key']??''),$clauses),true);
        if(empty($definition['nameAr']))$errors[]=['severity'=>'error','code'=>'TEMPLATE_NAME_REQUIRED','messageAr'=>'اسم القالب مطلوب','path'=>'nameAr'];
        if(!$variants)$errors[]=['severity'=>'error','code'=>'VARIANTS_REQUIRED','messageAr'=>'يجب إضافة نوع عقد واحد على الأقل','path'=>'variants'];
        foreach($variants as $vi=>$variant){if(empty($variant['key'])||empty($variant['nameAr']))$errors[]=['severity'=>'error','code'=>'VARIANT_INVALID','messageAr'=>'مفتاح واسم نوع العقد مطلوبان','path'=>"variants.$vi"];if(empty($variant['steps']))$warnings[]=['severity'=>'warning','code'=>'VARIANT_STEPS_EMPTY','messageAr'=>'نوع العقد لا يحتوي خطوات','path'=>"variants.$vi.steps"];foreach($variant['requiredClauseKeys']??[] as$ci=>$key)if(!isset($known[(string)$key]))$errors[]=['severity'=>'error','code'=>'CLAUSE_MISSING','messageAr'=>"البند المطلوب غير موجود: {$key}",'path'=>"variants.$vi.requiredClauseKeys.$ci"];}
        [$structureErrors,$structureWarnings]=$this->inspectDefinition($definition);$errors=array_merge($errors,$structureErrors);$warnings=array_merge($warnings,$structureWarnings);
        $stats=['variants'=>count($variants),'steps'=>array_sum(array_map(fn($v)=>count($v['steps']??[]),$variants)),'fields'=>array_sum(array_map(fn($v)=>array_sum(array_map(fn($s)=>count($s['fields']??[]),$v['steps']??[])),$variants)),'legalClauses'=>count($clauses),'optionalClauses'=>count($definition['optionalClauses']??[])];
        return $this->ok($request,['errors'=>$errors,'warnings'=>$warnings,'stats'=>$stats]);
    }

    public function adminPatchVersion(Request $request,int $versionId)
    {
        $row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['definition'=>['required','array'],'changeSummary'=>['nullable','string','max:2000'],'legalReference'=>['nullable','string','max:500'],'effectiveFrom'=>['nullable','date']]);$definition=$data['definition'];$definition['version']=(int)$row->version_number;$definition['slug']=$definition['slug']??$row->slug;$old=$this->definition($row->definition_json);$this->saveDefinition($request,$row,$definition,'template.version_metadata_updated',$old,['changeSummary'=>$data['changeSummary']??null,'legalReference'=>$data['legalReference']??null,'effectiveFrom'=>$data['effectiveFrom']??null]);DB::table('template_versions')->where('id',$versionId)->update(['change_summary'=>$data['changeSummary']??null,'legal_reference'=>$data['legalReference']??null,'effective_from'=>$data['effectiveFrom']??null,'updated_at'=>now()]);return $this->ok($request,['id'=>$versionId],'تم حفظ إعدادات الإصدار');
    }

    public function adminSubmitReview(Request $request,int $versionId){$row=$this->versionRow($versionId);$this->assertDraft($row);DB::table('template_versions')->where('id',$versionId)->update(['status'=>'legal_review','updated_at'=>now()]);$this->audit->write($request,'template.version_submitted_for_review','template_version',$versionId,['status'=>'draft'],['status'=>'legal_review']);return $this->ok($request,['id'=>$versionId,'status'=>'legal_review'],'تم إرسال الإصدار للمراجعة القانونية');}
    public function adminReturnDraft(Request $request,int $versionId){$row=$this->versionRow($versionId);if($row->status!=='legal_review')throw new ApiException(409,'الإصدار ليس في المراجعة القانونية');$data=$request->validate(['reason'=>['required','string','max:2000']]);DB::table('template_versions')->where('id',$versionId)->update(['status'=>'draft','updated_at'=>now()]);$this->audit->write($request,'template.version_returned_to_draft','template_version',$versionId,['status'=>'legal_review'],['status'=>'draft','reason'=>$data['reason']]);return $this->ok($request,['id'=>$versionId,'status'=>'draft'],'أعيد الإصدار إلى المسودة');}
    public function adminPublish(Request $request,int $versionId){$row=$this->versionRow($versionId);if($row->status!=='legal_review')throw new ApiException(409,'الإصدار يجب أن يكون في المراجعة القانونية قبل النشر');$definition=$this->definition($row->definition_json);$actor=(int)($request->attributes->get('auth_user')['id']??0);DB::transaction(function()use($request,$row,$definition,$actor){DB::table('template_versions')->where('template_id',$row->template_id)->where('status','published')->update(['status'=>'archived','updated_at'=>now()]);DB::table('template_versions')->where('id',$row->id)->update(['status'=>'published','approved_by'=>$actor,'published_at'=>now(),'updated_at'=>now()]);DB::table('contract_templates')->where('id',$row->template_id)->update(['current_published_version_id'=>$row->id,'template_version'=>$row->version_number,'name_ar'=>$definition['nameAr']??$row->name_ar,'description'=>$definition['description']??$row->description,'updated_at'=>now()]);$this->audit->write($request,'template.version_published','template_version',(int)$row->id,['status'=>'legal_review'],['status'=>'published','versionNumber'=>(int)$row->version_number]);});return $this->ok($request,['id'=>$versionId,'status'=>'published'],'تم اعتماد ونشر الإصدار');}

    public function adminPreview(Request $request,int $versionId){$row=$this->versionRow($versionId);$data=$request->validate(['variantKey'=>['required','string','max:140'],'selectedOptionalClauseKeys'=>['nullable','array'],'fieldValues'=>['nullable','array']]);$definition=$this->definition($row->definition_json);$rendered=$this->engine->renderLegalClauses($definition,$data['variantKey'],array_values(array_map('strval',$data['selectedOptionalClauseKeys']??[])),$data['fieldValues']??[]);return $this->ok($request,['clauses'=>$rendered['clauses']??[],'missingVariables'=>$rendered['missingVariables']??[],'missingClauseKeys'=>$rendered['missingClauseKeys']??[],'definitionVersion'=>(int)($definition['version']??$row->version_number)]);}

    public function adminUpdate(Request $request,int $templateId)
    {
        $data=$request->validate([
            'variantPrices'=>['sometimes','array','max:50'],'variantPrices.*.variantKey'=>['required_with:variantPrices','string','max:140'],
            'variantPrices.*.selfServicePriceEgp'=>['required_with:variantPrices','numeric','min:0','max:1000000'],
            'variantPrices.*.lawyerAssistedPriceEgp'=>['required_with:variantPrices','numeric','min:0','max:1000000'],
            'categoryId'=>['sometimes','nullable','integer','exists:contract_template_categories,id'],
        ]);
        if(!$data)throw new ApiException(422,'لا يوجد تعديل للحفظ');
        $old=DB::selectOne("SELECT ct.id,ct.slug,tv.definition_json FROM contract_templates ct LEFT JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.id=?",[$templateId]);
        if(!$old)throw new ApiException(404,'نوع العقد غير موجود');
        $definition=is_string($old->definition_json)?json_decode($old->definition_json,true):(array)($old->definition_json??[]);
        DB::transaction(function()use($request,$templateId,$old,$definition,$data){
            if(isset($data['variantPrices']))$this->pricing->save((string)$old->slug,$definition,$data['variantPrices'],(int)$request->attributes->get('auth_user')['id']);
            if(array_key_exists('categoryId',$data))DB::table('contract_templates')->where('id',$templateId)->update(['category_id'=>$data['categoryId'],'updated_at'=>now()]);
            $this->audit->write($request,array_key_exists('categoryId',$data)?'template.metadata_updated':'template.variant_pricing_updated','contract_template',$templateId,null,$data);
        });
        return $this->ok($request,['id'=>$templateId]+$data,'تم تحديث أسعار العقود');
    }

    public function adminAddVariant(Request $request,int $versionId){$row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['variant'=>['required','array'],'variant.key'=>['required','string','max:140','regex:/^[a-z0-9_.-]+$/'],'variant.nameAr'=>['required','string','max:200']]);$definition=$this->definition($row->definition_json);$variants=$definition['variants']??[];if(collect($variants)->contains(fn($v)=>(string)($v['key']??'')===$data['variant']['key']))throw new ApiException(409,'مفتاح نوع العقد مستخدم بالفعل');$variant=$this->normalizeVariant($data['variant']);$variants[]=$variant;$definition['variants']=$variants;$this->saveDefinition($request,$row,$definition,'template.variant_created',$this->definition($row->definition_json),['variantKey'=>$variant['key']]);return $this->ok($request,$variant,'تمت إضافة نوع العقد');}
    public function adminPatchVariant(Request $request,int $versionId,string $variantKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['variant'=>['required','array']]);$definition=$this->definition($row->definition_json);$i=$this->findIndex($definition['variants']??[],$variantKey);if($i===null)throw new ApiException(404,'نوع العقد غير موجود');$old=$definition;$patch=$data['variant'];$moveToIndex=$patch['moveToIndex']??null;unset($patch['moveToIndex']);$definition['variants'][$i]=array_merge($definition['variants'][$i],$patch);if($moveToIndex!==null)$definition['variants']=$this->moveItem($definition['variants'],$i,(int)$moveToIndex);$this->saveDefinition($request,$row,$definition,'template.variant_updated',$old,['variantKey'=>$variantKey]);return $this->ok($request,$definition['variants'],'تم تحديث نوع العقد');}
    public function adminDeleteVariant(Request $request,int $versionId,string $variantKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$definition=$this->definition($row->definition_json);$i=$this->findIndex($definition['variants']??[],$variantKey);if($i===null)throw new ApiException(404,'نوع العقد غير موجود');$old=$definition;array_splice($definition['variants'],$i,1);$this->saveDefinition($request,$row,$definition,'template.variant_deleted',$old,['variantKey'=>$variantKey]);return $this->ok($request,['deleted'=>true],'تم حذف نوع العقد');}

    public function adminAddStep(Request $request,int $versionId,string $variantKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['step'=>['required','array'],'step.key'=>['required','string','max:140','regex:/^[a-z0-9_.-]+$/'],'step.titleAr'=>['required','string','max:200']]);$definition=$this->definition($row->definition_json);$vi=$this->findIndex($definition['variants']??[],$variantKey);if($vi===null)throw new ApiException(404,'نوع العقد غير موجود');$step=$this->normalizeStep($data['step']);$definition['variants'][$vi]['steps']=array_values($definition['variants'][$vi]['steps']??[]);if(collect($definition['variants'][$vi]['steps'])->contains(fn($s)=>(string)($s['key']??'')===$step['key']))throw new ApiException(409,'مفتاح الخطوة مستخدم بالفعل');$definition['variants'][$vi]['steps'][]=$step;$this->saveDefinition($request,$row,$definition,'template.step_created',$this->definition($row->definition_json),['variantKey'=>$variantKey,'stepKey'=>$step['key']]);return $this->ok($request,$step,'تمت إضافة الخطوة');}
    public function adminPatchStep(Request $request,int $versionId,string $variantKey,string $stepKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['step'=>['required','array']]);$definition=$this->definition($row->definition_json);$vi=$this->findIndex($definition['variants']??[],$variantKey);if($vi===null)throw new ApiException(404,'نوع العقد غير موجود');$si=$this->findIndex($definition['variants'][$vi]['steps']??[],$stepKey);if($si===null)throw new ApiException(404,'الخطوة غير موجودة');$old=$definition;$patch=$data['step'];$moveToIndex=$patch['moveToIndex']??null;unset($patch['moveToIndex']);$definition['variants'][$vi]['steps'][$si]=array_merge($definition['variants'][$vi]['steps'][$si],$patch);if($moveToIndex!==null)$definition['variants'][$vi]['steps']=$this->moveItem($definition['variants'][$vi]['steps'],$si,(int)$moveToIndex);$this->saveDefinition($request,$row,$definition,'template.step_updated',$old,['variantKey'=>$variantKey,'stepKey'=>$stepKey]);return $this->ok($request,$definition['variants'][$vi]['steps'],'تم تحديث الخطوة');}
    public function adminDeleteStep(Request $request,int $versionId,string $variantKey,string $stepKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$definition=$this->definition($row->definition_json);$vi=$this->findIndex($definition['variants']??[],$variantKey);if($vi===null)throw new ApiException(404,'نوع العقد غير موجود');$si=$this->findIndex($definition['variants'][$vi]['steps']??[],$stepKey);if($si===null)throw new ApiException(404,'الخطوة غير موجودة');$old=$definition;array_splice($definition['variants'][$vi]['steps'],$si,1);$this->saveDefinition($request,$row,$definition,'template.step_deleted',$old,['variantKey'=>$variantKey,'stepKey'=>$stepKey]);return $this->ok($request,['deleted'=>true],'تم حذف الخطوة');}

    public function adminAddField(Request $request,int $versionId){return $this->fieldMutation($request,$versionId,false);}
    public function adminPatchField(Request $request,int $versionId,string $fieldKey){return $this->fieldMutation($request,$versionId,true,$fieldKey);}
    public function adminPatchFieldHelp(Request $request,int $versionId,string $fieldKey){$row=$this->versionRow($versionId);$data=$request->validate(['variantKey'=>['required','string'],'stepKey'=>['required','string'],'helpText'=>['nullable','string','max:5000'],'helpRef'=>['nullable','string','max:160']]);$definition=$this->definition($row->definition_json);$vi=$this->findIndex($definition['variants']??[],$data['variantKey']);$si=$vi===null?null:$this->findIndex($definition['variants'][$vi]['steps']??[],$data['stepKey']);$fi=($vi!==null&&$si!==null)?$this->findIndex($definition['variants'][$vi]['steps'][$si]['fields']??[],$fieldKey):null;if($vi===null||$si===null||$fi===null)throw new ApiException(404,'الحقل غير موجود');$old=$definition;$definition['variants'][$vi]['steps'][$si]['fields'][$fi]['helpText']=$data['helpText']??null;$definition['variants'][$vi]['steps'][$si]['fields'][$fi]['helpRef']=$data['helpRef']??null;$this->saveDefinition($request,$row,$definition,'template.field_help_updated',$old,['variantKey'=>$data['variantKey'],'stepKey'=>$data['stepKey'],'fieldKey'=>$fieldKey]);return $this->ok($request,$definition['variants'][$vi]['steps'][$si]['fields'][$fi],'تم تحديث مساعدة الحقل');}
    public function adminDeleteField(Request $request,int $versionId,string $fieldKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['variantKey'=>['required','string'],'stepKey'=>['required','string']]);$definition=$this->definition($row->definition_json);$vi=$this->findIndex($definition['variants']??[],$data['variantKey']);$si=$vi===null?null:$this->findIndex($definition['variants'][$vi]['steps']??[],$data['stepKey']);if($vi===null||$si===null)throw new ApiException(404,'الخطوة غير موجودة');$fi=$this->findIndex($definition['variants'][$vi]['steps'][$si]['fields']??[],$fieldKey);if($fi===null)throw new ApiException(404,'الحقل غير موجود');$old=$definition;array_splice($definition['variants'][$vi]['steps'][$si]['fields'],$fi,1);$this->saveDefinition($request,$row,$definition,'template.field_deleted',$old,['fieldKey'=>$fieldKey]);return $this->ok($request,['deleted'=>true],'تم حذف الحقل');}

    public function adminAddClause(Request $request,int $versionId){return $this->clauseMutation($request,$versionId,false);}
    public function adminPatchClause(Request $request,int $versionId,string $clauseKey){return $this->clauseMutation($request,$versionId,true,$clauseKey);}
    public function adminPatchClauseGuidance(Request $request,int $versionId,string $clauseKey){$row=$this->versionRow($versionId);$data=$request->validate(['guidance'=>['nullable','string','max:5000']]);$definition=$this->definition($row->definition_json);$i=$this->findIndex($definition['legalClauses']??[],$clauseKey);if($i===null)throw new ApiException(404,'البند غير موجود');$old=$definition;$definition['legalClauses'][$i]['guidance']=$data['guidance']??null;$this->saveDefinition($request,$row,$definition,'template.clause_guidance_updated',$old,['clauseKey'=>$clauseKey]);return $this->ok($request,$definition['legalClauses'][$i],'تم تحديث إرشاد البند');}
    public function adminDeleteClause(Request $request,int $versionId,string $clauseKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$definition=$this->definition($row->definition_json);$i=$this->findIndex($definition['legalClauses']??[],$clauseKey);if($i===null)throw new ApiException(404,'البند غير موجود');$old=$definition;$definition['legalClauses'][$i]['enabled']=false;$this->saveDefinition($request,$row,$definition,'template.clause_disabled',$old,['clauseKey'=>$clauseKey]);return $this->ok($request,['disabled'=>true],'تم تعطيل البند');}

    public function adminAddOptional(Request $request,int $versionId){return $this->optionalMutation($request,$versionId,false);}
    public function adminPatchOptional(Request $request,int $versionId,string $optionalKey){return $this->optionalMutation($request,$versionId,true,$optionalKey);}
    public function adminDeleteOptional(Request $request,int $versionId,string $optionalKey){$row=$this->versionRow($versionId);$this->assertDraft($row);$definition=$this->definition($row->definition_json);$i=$this->findIndex($definition['optionalClauses']??[],$optionalKey);if($i===null)throw new ApiException(404,'الإضافة غير موجودة');$old=$definition;array_splice($definition['optionalClauses'],$i,1);$this->saveDefinition($request,$row,$definition,'template.optional_clause_deleted',$old,['optionalKey'=>$optionalKey]);return $this->ok($request,['deleted'=>true],'تم حذف الإضافة');}

    private function fieldMutation(Request $request,int $versionId,bool $update,?string $fieldKey=null)
    {
        $row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['variantKey'=>['required','string'],'stepKey'=>['required','string'],'field'=>['required','array'],'field.key'=>['required','string','max:160','regex:/^[a-z0-9_.-]+$/'],'field.type'=>['required','string','in:text,textarea,number,money,date,select,radio,checkbox,attachment,repeater'],'field.labelAr'=>['required','string','max:300'],'field.moveToIndex'=>['sometimes','integer','min:0']]);$definition=$this->definition($row->definition_json);$vi=$this->findIndex($definition['variants']??[],$data['variantKey']);$si=$vi===null?null:$this->findIndex($definition['variants'][$vi]['steps']??[],$data['stepKey']);if($vi===null||$si===null)throw new ApiException(404,'الخطوة غير موجودة');$fields=$definition['variants'][$vi]['steps'][$si]['fields']??[];$key=$fieldKey??$data['field']['key'];$fi=$this->findIndex($fields,$key);if($update&&$fi===null)throw new ApiException(404,'الحقل غير موجود');if(!$update&&$fi!==null)throw new ApiException(409,'مفتاح الحقل مستخدم بالفعل');$old=$definition;$moveToIndex=$data['field']['moveToIndex']??null;unset($data['field']['moveToIndex']);$field=array_merge($update?$fields[$fi]:[],$data['field']);if($field['type']==='attachment')$field['attachmentRules']=$field['attachmentRules']??[];if($update)$fields[$fi]=$field;else{$fields[]=$field;$fi=count($fields)-1;}if($moveToIndex!==null)$fields=$this->moveItem($fields,$fi,(int)$moveToIndex);$definition['variants'][$vi]['steps'][$si]['fields']=array_values($fields);$this->saveDefinition($request,$row,$definition,$update?'template.field_updated':'template.field_created',$old,['variantKey'=>$data['variantKey'],'stepKey'=>$data['stepKey'],'fieldKey'=>$key]);return $this->ok($request,$field,$update?'تم تعديل الحقل':'تمت إضافة الحقل');
    }

    private function clauseMutation(Request $request,int $versionId,bool $update,?string $clauseKey=null)
    {
        $row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['clause'=>['required','array'],'clause.key'=>['required','string','max:160','regex:/^[a-z0-9_.-]+$/'],'clause.titleAr'=>['required','string','max:300'],'clause.bodyAr'=>['required','string']]);$definition=$this->definition($row->definition_json);$definition['legalClauses']=$definition['legalClauses']??[];$key=$clauseKey??$data['clause']['key'];$i=$this->findIndex($definition['legalClauses'],$key);if($update&&$i===null)throw new ApiException(404,'البند غير موجود');if(!$update&&$i!==null)throw new ApiException(409,'مفتاح البند مستخدم بالفعل');$old=$definition;$clause=$data['clause'];$moveToIndex=$clause['moveToIndex']??null;unset($clause['moveToIndex']);$clause=array_merge($update?$definition['legalClauses'][$i]:[],$clause);if($update)$definition['legalClauses'][$i]=$clause;else{$definition['legalClauses'][]=$clause;$i=count($definition['legalClauses'])-1;}if($moveToIndex!==null)$definition['legalClauses']=$this->moveItem($definition['legalClauses'],$i,(int)$moveToIndex);$this->saveDefinition($request,$row,$definition,$update?'template.clause_updated':'template.clause_created',$old,['clauseKey'=>$key]);return $this->ok($request,$clause,$update?'تم تعديل البند':'تمت إضافة البند');
    }

    private function optionalMutation(Request $request,int $versionId,bool $update,?string $optionalKey=null)
    {
        $row=$this->versionRow($versionId);$this->assertDraft($row);$data=$request->validate(['optionalClause'=>['required','array'],'optionalClause.key'=>['required','string','max:160','regex:/^[a-z0-9_.-]+$/'],'optionalClause.nameAr'=>['required','string','max:300'],'optionalClause.description'=>['required','string']]);$definition=$this->definition($row->definition_json);$definition['optionalClauses']=$definition['optionalClauses']??[];$key=$optionalKey??$data['optionalClause']['key'];$i=$this->findIndex($definition['optionalClauses'],$key);if($update&&$i===null)throw new ApiException(404,'الإضافة غير موجودة');if(!$update&&$i!==null)throw new ApiException(409,'مفتاح الإضافة مستخدم بالفعل');$old=$definition;$item=array_merge($update?$definition['optionalClauses'][$i]:[],$data['optionalClause']);if($update)$definition['optionalClauses'][$i]=$item;else$definition['optionalClauses'][]=$item;$this->saveDefinition($request,$row,$definition,$update?'template.optional_clause_updated':'template.optional_clause_created',$old,['optionalKey'=>$key]);return $this->ok($request,$item,$update?'تم تعديل الإضافة':'تمت إضافة الإضافة');
    }

    private function inspectDefinition(array $definition): array
    {
        $errors=[];$warnings=[];$seenVariants=[];$seenClauses=[];
        foreach($definition['variants']??[] as$vi=>$variant){$variantKey=(string)($variant['key']??'');if($variantKey!==''&&isset($seenVariants[$variantKey]))$errors[]=['severity'=>'error','code'=>'VARIANT_KEY_DUPLICATE','messageAr'=>'مفتاح نوع العقد مكرر','path'=>"variants.$vi.key"];if($variantKey!=='')$seenVariants[$variantKey]=true;$seenSteps=[];foreach($variant['steps']??[]as$si=>$step){$stepKey=(string)($step['key']??'');if($stepKey!==''&&isset($seenSteps[$stepKey]))$errors[]=['severity'=>'error','code'=>'STEP_KEY_DUPLICATE','messageAr'=>'مفتاح الخطوة مكرر داخل نوع العقد','path'=>"variants.$vi.steps.$si.key"];if($stepKey!=='')$seenSteps[$stepKey]=true;$seenFields=[];foreach($step['fields']??[]as$fi=>$field){$fieldKey=(string)($field['key']??'');if($fieldKey!==''&&isset($seenFields[$fieldKey]))$errors[]=['severity'=>'error','code'=>'FIELD_KEY_DUPLICATE','messageAr'=>'مفتاح الحقل مكرر داخل الخطوة','path'=>"variants.$vi.steps.$si.fields.$fi.key"];if($fieldKey!=='')$seenFields[$fieldKey]=true;$rules=$field['attachmentRules']??[];if(($field['type']??null)==='attachment'&&isset($rules['maxFiles'])&&(int)$rules['maxFiles']<1)$errors[]=['severity'=>'error','code'=>'ATTACHMENT_MAX_FILES_INVALID','messageAr'=>'الحد الأقصى لعدد الملفات يجب أن يكون أكبر من صفر','path'=>"variants.$vi.steps.$si.fields.$fi.attachmentRules.maxFiles"];if(($field['numberToWords']??false)&&!in_array($field['type']??null,['number','money'],true))$warnings[]=['severity'=>'warning','code'=>'NUMBER_TO_WORDS_TYPE','messageAr'=>'تحويل الرقم إلى كتابة يُطبق على حقول الأرقام والمبالغ فقط','path'=>"variants.$vi.steps.$si.fields.$fi.numberToWords"];}}
        }
        foreach($definition['legalClauses']??[]as$ci=>$clause){$key=(string)($clause['key']??'');if($key!==''&&isset($seenClauses[$key]))$errors[]=['severity'=>'error','code'=>'CLAUSE_KEY_DUPLICATE','messageAr'=>'مفتاح البند القانوني مكرر','path'=>"legalClauses.$ci.key"];if($key!=='')$seenClauses[$key]=true;}
        foreach($definition['variants']??[]as$vi=>$variant){$readiness=$variant['readiness']??[];$seenSections=[];$seenItems=[];foreach($readiness['sections']??[]as$si=>$section){$sectionKey=(string)($section['key']??'');if($sectionKey!==''&&isset($seenSections[$sectionKey]))$errors[]=['severity'=>'error','code'=>'READINESS_SECTION_DUPLICATE','messageAr'=>'مفتاح قسم صفحة التجهيز مكرر','path'=>"variants.$vi.readiness.sections.$si.key"];if($sectionKey!=='')$seenSections[$sectionKey]=true;foreach($section['items']??[]as$ii=>$item){$itemKey=(string)($item['key']??'');if($itemKey!==''&&isset($seenItems[$itemKey]))$errors[]=['severity'=>'error','code'=>'READINESS_ITEM_DUPLICATE','messageAr'=>'مفتاح متطلب صفحة التجهيز مكرر','path'=>"variants.$vi.readiness.sections.$si.items.$ii.key"];if($itemKey!=='')$seenItems[$itemKey]=true;}}}
        return[$errors,$warnings];
    }
    private function versionRow(int $versionId): object
    {
        $row=DB::selectOne('SELECT tv.*,ct.slug,ct.name_ar,ct.description FROM template_versions tv JOIN contract_templates ct ON ct.id=tv.template_id WHERE tv.id=?',[$versionId]);if(!$row)throw new ApiException(404,'إصدار القالب غير موجود');return $row;
    }
    private function definition(mixed $value): array { if(is_string($value)){$decoded=json_decode($value,true);return is_array($decoded)?$decoded:[];}return is_array($value)?$value:(array)$value; }
    private function assertDraft(object $row): void { if((string)$row->status!=='draft')throw new ApiException(409,'لا يمكن تعديل إصدار منشور أو قيد المراجعة؛ أنشئ Version جديدة أولاً','TEMPLATE_VERSION_NOT_EDITABLE'); }
    private function saveDefinition(Request $request,object $row,array $definition,string $action,array $old,array $meta=[]): void { DB::statement('UPDATE template_versions SET definition_json=?::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=?', [json_encode($definition,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$row->id]);$this->audit->write($request,$action,'template_version',(int)$row->id,$old,$meta+['definition'=>$definition]); }
    private function findIndex(array $items,string $key): ?int { foreach($items as $i=>$item)if((string)($item['key']??'')===$key)return $i;return null; }
    private function moveItem(array $items,int $from,int $to): array { if($to<0||$to>=count($items)||$from===$to)return array_values($items);$item=$items[$from];array_splice($items,$from,1);array_splice($items,$to,0,[$item]);return array_values($items); }
    private function normalizeVariant(array $variant): array { return array_merge(['key'=>'','nameAr'=>'','description'=>'','requiredClauseKeys'=>[],'allowedOptionalClauseKeys'=>[],'steps'=>[]],$variant,['steps'=>array_values($variant['steps']??[])]); }
    private function normalizeStep(array $step): array { return array_merge(['key'=>'','titleAr'=>'','fields'=>[]],$step,['fields'=>array_values($step['fields']??[])]); }
}
