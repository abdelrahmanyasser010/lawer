<?php
namespace Tests\Unit;
use PHPUnit\Framework\TestCase;
final class TemplateDefinitionsTest extends TestCase
{
    public function test_canonical_template_definitions_are_complete(): void
    {
        $files=glob(dirname(__DIR__,2).'/database/template-definitions/*.json')?:[];
        $this->assertCount(3,$files);
        $slugs=[];$clauses=0;
        foreach($files as$file){$data=json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR);$slugs[]=$data['slug'];$this->assertCount(3,$data['variants']);$this->assertNotEmpty($data['legalClauses']);$clauses+=count($data['legalClauses']);}
        sort($slugs);
        $this->assertSame(['apartment_sale','freelancer','rental'],$slugs);
        $this->assertSame(378,$clauses);
    }
}
