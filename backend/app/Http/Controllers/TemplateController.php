<?php
namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\ContractPricingService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class TemplateController extends Controller
{
    use ApiResponse;
    public function __construct(private AuditService $audit,private ContractPricingService $pricing) {}

    public function index(Request $request)
    {
        $rows = DB::select("SELECT ct.id,ct.slug,ct.name_ar AS \"nameAr\",ct.description,0::float AS \"priceEgp\",tv.version_number AS version,jsonb_array_length(COALESCE(tv.definition_json->'variants','[]'::jsonb)) AS \"variantsCount\" FROM contract_templates ct LEFT JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.is_active=TRUE AND tv.status='published' ORDER BY ct.id");
        return $this->ok($request, $rows);
    }

    public function definition(Request $request, string $slug)
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
        $rows = DB::select("SELECT ct.id,ct.slug,ct.name_ar AS \"nameAr\",ct.description,ct.is_active AS \"isActive\",tv.version_number AS version,tv.definition_json AS definition FROM contract_templates ct LEFT JOIN template_versions tv ON tv.id=ct.current_published_version_id ORDER BY ct.id");
        $payload=[];
        foreach($rows as$row){
            $definition=is_string($row->definition)?json_decode($row->definition,true):(array)($row->definition??[]);
            $pricing=$this->pricing->forDefinition((string)$row->slug,$definition);
            $variants=[];foreach($definition['variants']??[] as$variant){$key=(string)($variant['key']??'');if($key==='')continue;$p=$pricing[$key]??['selfServicePriceEgp'=>0.0,'lawyerAssistedPriceEgp'=>0.0];$variants[]=['key'=>$key,'nameAr'=>(string)($variant['nameAr']??$key),'description'=>(string)($variant['description']??''),'selfServicePriceEgp'=>(float)$p['selfServicePriceEgp'],'lawyerAssistedPriceEgp'=>(float)$p['lawyerAssistedPriceEgp']];}
            $payload[]=['id'=>(int)$row->id,'slug'=>(string)$row->slug,'nameAr'=>(string)$row->nameAr,'description'=>(string)$row->description,'priceEgp'=>0.0,'isActive'=>(bool)$row->isActive,'version'=>(int)($row->version??0),'variantsCount'=>count($variants),'variants'=>$variants];
        }
        return $this->ok($request,$payload);
    }

    public function adminUpdate(Request $request,int $templateId)
    {
        $data=$request->validate([
            'variantPrices'=>['sometimes','array','max:50'],'variantPrices.*.variantKey'=>['required_with:variantPrices','string','max:140'],
            'variantPrices.*.selfServicePriceEgp'=>['required_with:variantPrices','numeric','min:0','max:1000000'],
            'variantPrices.*.lawyerAssistedPriceEgp'=>['required_with:variantPrices','numeric','min:0','max:1000000'],
        ]);
        if(!$data)throw new ApiException(422,'لا يوجد تعديل للحفظ');
        $old=DB::selectOne("SELECT ct.id,ct.slug,tv.definition_json FROM contract_templates ct LEFT JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.id=?",[$templateId]);
        if(!$old)throw new ApiException(404,'نوع العقد غير موجود');
        $definition=is_string($old->definition_json)?json_decode($old->definition_json,true):(array)($old->definition_json??[]);
        DB::transaction(function()use($request,$templateId,$old,$definition,$data){
            if(isset($data['variantPrices']))$this->pricing->save((string)$old->slug,$definition,$data['variantPrices'],(int)$request->attributes->get('auth_user')['id']);
            $this->audit->write($request,'template.variant_pricing_updated','contract_template',$templateId,null,$data);
        });
        return $this->ok($request,['id'=>$templateId]+$data,'تم تحديث أسعار العقود');
    }
}
