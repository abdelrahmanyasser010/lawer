<?php
namespace App\Http\Controllers;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class CatalogController extends Controller
{
    use ApiResponse;
    public function __invoke(Request $request)
    {
        $templates = DB::select('SELECT ct.id,ct.slug,ct.name_ar AS "nameAr",ct.description,ct.price_egp::float AS "priceEgp",tv.version_number AS version FROM contract_templates ct JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.is_active=TRUE AND tv.status=\'published\' ORDER BY ct.id');
        $keys = [
            'contracts.self_service_edit_hours','customer_portal.communication_channels','customer_portal.chat_enabled',
            'services.contract_review.deposit_egp','services.consultation.deposit_egp','services.contract_drafting.deposit_egp',
            'office.display_name','office.address','office.whatsapp_number','payments.vodafone_cash_number',
        ];
        $rows = DB::table('platform_settings')->selectRaw('setting_key AS key,setting_value_json AS value')->where('is_secret', false)->whereIn('setting_key',$keys)->get();
        $settings = [];
        foreach ($rows as $row) $settings[$row->key] = is_string($row->value) ? json_decode($row->value, true) : $row->value;
        $get = fn(string $key,mixed $fallback) => $settings[$key] ?? $fallback;
        return $this->ok($request, [
            'templates' => $templates,
            'services' => [
                'contractReviewDepositEgp' => (float) $get('services.contract_review.deposit_egp',100),
                'consultationDepositEgp' => (float) $get('services.consultation.deposit_egp',100),
                'contractDraftingDepositEgp' => (float) $get('services.contract_drafting.deposit_egp',100),
            ],
            'office' => ['displayName' => (string) $get('office.display_name','Z draft'), 'address' => (string) $get('office.address',''), 'whatsappNumber' => (string) $get('office.whatsapp_number','')],
            'payment' => ['vodafoneCashNumber' => (string) $get('payments.vodafone_cash_number','')],
            'policies' => [
                'selfServiceEditHours' => (int) $get('contracts.self_service_edit_hours',24),
                'communicationChannels' => $get('customer_portal.communication_channels',['office','zoom','whatsapp']),
                'chatEnabled' => (bool) $get('customer_portal.chat_enabled',false),
            ],
        ]);
    }
}
