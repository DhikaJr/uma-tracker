<?php

namespace Tests\Feature;

use Tests\TestCase;

class TestingEnvironmentTest extends TestCase
{
    public function test_application_and_deprecation_logs_are_discarded_during_tests(): void
    {
        $this->assertSame('testing', app()->environment());
        $this->assertSame('null', config('logging.default'));
        $this->assertSame('null', config('logging.deprecations.channel'));
    }
}
