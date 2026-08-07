<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiException;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class TemplateController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $rows = DB::select("SELECT ct.id,ct.slug,ct.name_ar AS \"nameAr\",ct.description,ct.price_egp::float AS \"priceEgp\",tv.version_number AS version,jsonb_array_length(COALESCE(tv.definition_json->'variants','[]'::jsonb)) AS \"variantsCount\" FROM contract_templates ct LEFT JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.is_active=TRUE AND tv.status='published' ORDER BY ct.id");
        return $this->ok($request, $rows);
    }
    public function definition(Request $request, string $slug)
    {
        $row = DB::selectOne("SELECT tv.definition_json FROM contract_templates ct JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.slug=? AND ct.is_active=TRUE AND tv.status='published'", [$slug]);
        if (!$row) throw new ApiException(404, 'القالب المنشور غير موجود', 'TEMPLATE_NOT_PUBLISHED');
        $definition = is_string($row->definition_json) ? json_decode($row->definition_json, true) : $row->definition_json;
        return $this->ok($request, $definition);
    }
}
