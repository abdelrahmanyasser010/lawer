<?php
namespace Tests\Feature;
use Tests\TestCase;
final class ApiRouteContractTest extends TestCase
{
    public function test_all_frozen_v18_api_routes_are_preserved_exactly(): void
    {
        $manifest=json_decode(file_get_contents(base_path('tests/Fixtures/legacy_api_contract_v18.json')),true,512,JSON_THROW_ON_ERROR);
        $expected=collect($manifest['routes'])->map(fn($r)=>strtoupper($r['method']).' '.$r['path'])->sort()->values();
        $actual=collect(app('router')->getRoutes()->getRoutes())
            ->flatMap(function($route){
                $uri='/'.ltrim($route->uri(),'/');
                if(!str_starts_with($uri,'/api/v1/'))return[];
                return collect($route->methods())->reject(fn($m)=>$m==='HEAD')->map(fn($m)=>strtoupper($m).' '.$uri);
            })->sort()->values();
        $this->assertSame($expected->all(),$actual->all());
    }
}
