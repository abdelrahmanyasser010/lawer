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
        $templateRows = DB::select('SELECT ct.id,ct.slug,ct.name_ar AS "nameAr",ct.description,0::float AS "priceEgp",tv.version_number AS version,tv.definition_json AS definition FROM contract_templates ct JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.is_active=TRUE AND tv.status=\'published\' ORDER BY ct.id');
        $keys = [
            'contracts.self_service_edit_hours','customer_portal.communication_channels','customer_portal.chat_enabled',
            'services.contract_review.fee_egp','services.contract_review.deposit_egp','services.contract_drafting.deposit_egp',
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
        $communicationChannels = array_values(array_intersect((array) $get('customer_portal.communication_channels',['zoom','whatsapp']), ['zoom','whatsapp']));
        if (!$communicationChannels) $communicationChannels = ['zoom','whatsapp'];

        $templates=[];
        foreach($templateRows as$row){
            $definition=is_string($row->definition)?json_decode($row->definition,true):(array)$row->definition;
            $variantPricing=$this->pricing->forDefinition((string)$row->slug,$definition);
            $variants=[];
            foreach($definition['variants']??[] as$variant){
                $key=(string)($variant['key']??'');if($key==='')continue;$price=$variantPricing[$key]??['selfServicePriceEgp'=>0.0,'lawyerAssistedPriceEgp'=>0.0];
                $variants[]=[
                    'key'=>$key,'nameAr'=>(string)($variant['nameAr']??$key),'description'=>(string)($variant['description']??''),'documentTitleAr'=>(string)($variant['documentTitleAr']??$variant['nameAr']??''),
                    'selfServicePriceEgp'=>(float)$price['selfServicePriceEgp'],'lawyerAssistedPriceEgp'=>(float)$price['lawyerAssistedPriceEgp'],'lawyerDepositEgp'=>$draftingDeposit,
                ];
            }
            $templates[]=['id'=>(int)$row->id,'slug'=>(string)$row->slug,'nameAr'=>(string)$row->nameAr,'description'=>(string)$row->description,'priceEgp'=>0.0,'version'=>(int)$row->version,'variants'=>$variants];
        }

        return $this->ok($request, [
            'templates' => $templates,
            'services' => [
                'contractReviewFeeEgp' => (float) $get('services.contract_review.fee_egp',0),
                'contractReviewDepositEgp' => (float) $get('services.contract_review.deposit_egp',0),
                'contractDraftingDepositEgp' => $draftingDeposit,
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
}
