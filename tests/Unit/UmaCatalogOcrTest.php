<?php

namespace Tests\Unit;

use App\Support\UmaCatalog;
use PHPUnit\Framework\TestCase;

class UmaCatalogOcrTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        UmaCatalog::clearCache();
    }

    public function test_ocr_lookup_map_resolves_oguri_cap_and_costumes(): void
    {
        $map = UmaCatalog::getOcrLookupMap();

        $this->assertSame('Oguri Cap', $map['oguri cap']);
        $this->assertSame('Oguri Cap', $map['oguri']);
        $this->assertSame('Oguri Cap', $map['オグリキャップ']);
        $this->assertSame('Oguri Cap', $map['starlight beat']);
        $this->assertSame('Oguri Cap', $map['スターライトビート']);
        $this->assertSame('Oguri Cap', $map['ashen miracle']);
        $this->assertSame('Oguri Cap', $map['キセキの白星']);
    }

    public function test_ocr_lookup_map_resolves_epiphaneia_and_costumes(): void
    {
        $map = UmaCatalog::getOcrLookupMap();

        $this->assertSame('Epiphaneia', $map['epiphaneia']);
        $this->assertSame('Epiphaneia', $map['エピファネイア']);
        $this->assertSame('Epiphaneia', $map['fate choosen star']);
        $this->assertSame('Epiphaneia', $map['fate chosen star']);
        $this->assertSame('Epiphaneia', $map["fate's chosen star"]);
    }

    public function test_ocr_lookup_map_resolves_top_characters_and_variants(): void
    {
        $map = UmaCatalog::getOcrLookupMap();

        $this->assertSame('Tokai Teio', $map['tokai teio']);
        $this->assertSame('Tokai Teio', $map['teio']);
        $this->assertSame('Tokai Teio', $map['トウカイテイオー']);
        $this->assertSame('Tokai Teio', $map['beyond the horizon']);
        $this->assertSame('Tokai Teio', $map['ビヨンド・ザ・ホライズン']);

        $this->assertSame('Special Week', $map['special week']);
        $this->assertSame('Special Week', $map['スペシャルウィーク']);
        $this->assertSame('Special Week', $map['special dreamer']);
        $this->assertSame('Special Week', $map['スペシャル・ドリーマー']);

        $this->assertSame('Duramente', $map['duramente']);
        $this->assertSame('Duramente', $map['ドゥラメンテ']);
        $this->assertSame('Duramente', $map['red in black']);

        $this->assertSame('Orfevre', $map['orfevre']);
        $this->assertSame('Orfevre', $map['オルフェーヴル']);
        $this->assertSame('Orfevre', $map['total dominion']);
        $this->assertSame('Orfevre', $map['覇道']);

        $this->assertSame('Gentildonna', $map['gentildonna']);
        $this->assertSame('Gentildonna', $map['ジェンティルドンナ']);
        $this->assertSame('Gentildonna', $map['regina dei fiori']);

        $this->assertSame('Almond Eye', $map['almond eye']);
        $this->assertSame('Almond Eye', $map['アーモンドアイ']);
        $this->assertSame('Almond Eye', $map['the changer']);
    }

    public function test_clear_cache_clears_ocr_lookup_map(): void
    {
        $first = UmaCatalog::getOcrLookupMap();
        $this->assertNotEmpty($first);

        UmaCatalog::clearCache();

        $second = UmaCatalog::getOcrLookupMap();
        $this->assertNotEmpty($second);
    }
}
