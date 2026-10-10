<?php
namespace App\Http\Controllers;
use App\Services\ContractPricingService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class CatalogController extends Controller
{
    use ApiResponse;
    public function __construct(private ContractPricingService $pricing){}
    public function __invoke(Request $request)
    {
        $templateRows = DB::select('SELECT ct.id,ct.slug,ct.name_ar AS "nameAr",ct.description,0::float AS "priceEgp",ct.self_service_enabled AS "selfServiceEnabled",ct.lawyer_drafting_enabled AS "lawyerDraftingEnabled",tv.version_number AS version,tv.definition_json AS definition,cat.slug AS "categorySlug",cat.name_ar AS "categoryNameAr",cat.description AS "categoryDescription" FROM contract_templates ct LEFT JOIN contract_template_categories cat ON cat.id=ct.category_id JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.is_active=TRUE AND tv.status=\'published\' ORDER BY COALESCE(cat.sort_order,0),ct.id');
        $keys = [
            'contracts.self_service_edit_hours','customer_portal.communication_channels','customer_portal.chat_enabled',
            'services.contract_review.fee_egp','services.contract_review.deposit_egp','services.contract_drafting.deposit_egp',
            'services.self_service_lawyer_review.enabled','services.self_service_lawyer_review.fee_egp',
            'office.display_name','office.address','office.support_email','office.whatsapp_number','office.review_whatsapp_number','office.support_whatsapp_number','office.support_phone',
        ];
        $rows = DB::table('platform_settings')->selectRaw('setting_key AS key,setting_value_json AS value')->where('is_secret', false)->whereIn('setting_key',$keys)->get();
        $settings = [];
        foreach ($rows as $row) $settings[$row->key] = is_string($row->value) ? json_decode($row->value, true) : $row->value;
        $get = fn(string $key,mixed $fallback) => $settings[$key] ?? $fallback;
        $legacyWhatsapp = (string) $get('office.whatsapp_number','');
        $draftingDeposit = (float) $get('services.contract_drafting.deposit_egp',0);
        $reviewWhatsapp = trim((string) $get('office.review_whatsapp_number','')) ?: $legacyWhatsapp;
        $supportWhatsapp = trim((string) $get('office.support_whatsapp_number','')) ?: $legacyWhatsapp;
        $lawyerReviewEnabled = (bool) $get('services.self_service_lawyer_review.enabled',false);
        $lawyerReviewFee = (float) $get('services.self_service_lawyer_review.fee_egp',0);
        $communicationChannels = array_values(array_intersect((array) $get('customer_portal.communication_channels',['zoom','whatsapp']), ['zoom','whatsapp']));
        if (!$communicationChannels) $communicationChannels = ['zoom','whatsapp'];

        $templates=[];
        foreach($templateRows as$row){
            $definition=is_string($row->definition)?json_decode($row->definition,true):(array)$row->definition;
            $variantPricing=$this->pricing->forDefinition((string)$row->slug,$definition);
            $variants=[];
            foreach($definition['variants']??[] as$variant){
                $key=(string)($variant['key']??'');if($key==='')continue;$price=$variantPricing[$key]??['selfServicePriceEgp'=>0.0,'lawyerAssistedPriceEgp'=>0.0,'lawyerReviewAddOnPriceEgp'=>0.0];
                $selfServiceEnabled=(bool)$row->selfServiceEnabled&&($variant['selfServiceEnabled']??true)!==false;
                $lawyerDraftingEnabled=(bool)$row->lawyerDraftingEnabled&&($variant['lawyerDraftingEnabled']??true)!==false;
                $suitability=is_array($variant['suitability']??null)?$variant['suitability']:[];
                $lawyerDrafting=is_array($variant['lawyerDrafting']??null)?$variant['lawyerDrafting']:[];
                $variantReview=is_array($variant['lawyerReviewAddOn']??null)?$variant['lawyerReviewAddOn']:[];
                $variantReviewFee=(float)($price['lawyerReviewAddOnPriceEgp']??0);if($variantReviewFee<=0)$variantReviewFee=$lawyerReviewFee;
                $variants[]=[
                    'key'=>$key,'nameAr'=>(string)($variant['nameAr']??$key),'description'=>(string)($variant['description']??''),'documentTitleAr'=>(string)($variant['documentTitleAr']??$variant['nameAr']??''),
                    'selfServicePriceEgp'=>(float)$price['selfServicePriceEgp'],'lawyerAssistedPriceEgp'=>(float)$price['lawyerAssistedPriceEgp'],'lawyerDepositEgp'=>$draftingDeposit,
                    'selfServiceEnabled'=>$selfServiceEnabled,'lawyerDraftingEnabled'=>$lawyerDraftingEnabled,
                    'tags'=>$this->strings($variant['tags']??[]),
                    'suitability'=>[
                        'shortDescription'=>$this->nullableText($suitability['shortDescription']??($variant['description']??null)),
                        'suitableFor'=>$this->strings($suitability['suitableFor']??[]),
                        'notSuitableFor'=>$this->strings($suitability['notSuitableFor']??[]),
                    ],
                    'readiness'=>is_array($variant['readiness']??null)?$variant['readiness']:null,
                    'lawyerDrafting'=>['helpfulDocuments'=>$this->strings($lawyerDrafting['helpfulDocuments']??[])],
                    'lawyerReviewAddOn'=>[
                        'enabled'=>$selfServiceEnabled&&$lawyerReviewEnabled&&($variantReview['enabled']??true)!==false&&$variantReviewFee>0,
                        'priceEgp'=>$variantReviewFee,
                    ],
                ];
            }
            $templates[]=['id'=>(int)$row->id,'slug'=>(string)$row->slug,'nameAr'=>(string)$row->nameAr,'description'=>(string)$row->description,'priceEgp'=>0.0,'version'=>(int)$row->version,'selfServiceEnabled'=>(bool)$row->selfServiceEnabled,'lawyerDraftingEnabled'=>(bool)$row->lawyerDraftingEnabled,'categorySlug'=>$row->categorySlug?(string)$row->categorySlug:null,'categoryNameAr'=>$row->categoryNameAr?(string)$row->categoryNameAr:null,'categoryDescription'=>$row->categoryDescription?(string)$row->categoryDescription:null,'variants'=>$variants];
        }

        return $this->ok($request, [
            'templates' => $templates,
            'services' => [
                'contractReviewFeeEgp' => (float) $get('services.contract_review.fee_egp',0),
                'contractReviewDepositEgp' => (float) $get('services.contract_review.deposit_egp',0),
                'contractDraftingDepositEgp' => $draftingDeposit,
                'selfServiceLawyerReviewEnabled' => $lawyerReviewEnabled && $lawyerReviewFee > 0,
                'selfServiceLawyerReviewFeeEgp' => $lawyerReviewFee,
            ],
            'office' => [
                'displayName' => (string) $get('office.display_name','Z draft'),
                'address' => (string) $get('office.address',''),
                'whatsappNumber' => $legacyWhatsapp,
                'reviewWhatsappNumber' => $reviewWhatsapp,
                'supportWhatsappNumber' => $supportWhatsapp,
                'supportPhone' => (string) $get('office.support_phone',''),
                'supportEmail' => (string) $get('office.support_email',''),
            ],
            'payment' => ['vodafoneCashNumber' => ''],
            'policies' => [
                'selfServiceEditHours' => (int) $get('contracts.self_service_edit_hours',24),
                'communicationChannels' => $communicationChannels,
                'chatEnabled' => (bool) $get('customer_portal.chat_enabled',false),
            ],
        ]);
    }

    private function strings(mixed $value): array
    {
        if (!is_array($value)) return [];
        return array_values(array_filter(array_map(fn($item) => trim((string) $item), $value), fn($item) => $item !== ''));
    }

    private function nullableText(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));
        return $text === '' ? null : $text;
    }
}
