<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
final class FeatureDisabledController extends Controller
{
    public function __invoke(Request $request): never
    {
        throw new ApiException(404, 'الميزة مخفية في وضع السوبر أدمن الواحد، والكود محفوظ لإعادتها لاحقًا', 'FEATURE_DISABLED');
    }
}
