<?php

namespace Tests;

use Illuminate\Database\ConfigurationUrlParser;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    protected function refreshApplication(): void
    {
        parent::refreshApplication();

        // Laravel calls this before its parallel callbacks and database setup traits.
        $config = $this->app['config'];
        $connection = $config->get('database.default');
        $effective = (new ConfigurationUrlParser)->parseConfiguration(
            $config->get("database.connections.{$connection}", []),
        );

        if ($connection !== 'sqlite' || ($effective['driver'] ?? null) !== 'sqlite'
            || ($effective['database'] ?? null) !== ':memory:' || isset($effective['read']) || isset($effective['write'])) {
            throw new RuntimeException('Pengaman SQLite: suite tes hanya boleh memakai koneksi sqlite :memory:.');
        }
    }
}
