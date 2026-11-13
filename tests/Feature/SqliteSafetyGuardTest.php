<?php

namespace Tests\Feature;

use Illuminate\Foundation\Bootstrap\LoadConfiguration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use RuntimeException;
use Tests\TestCase;

class SqliteSafetyGuardTest extends TestCase
{
    #[DataProvider('unsafeConnections')]
    #[RunInSeparateProcess]
    public function test_unsafe_connections_stop_setup_before_refresh_database(string $connection, string $database, string $url): void
    {
        $test = new class('runSetup') extends TestCase
        {
            use RefreshDatabase;

            public function runSetup(): void
            {
                $this->setUp();
            }

            public function refreshDatabase(): void
            {
                throw new RuntimeException('RefreshDatabase was reached.');
            }
        };

        $config = config()->all();
        $config['database']['default'] = $connection;
        $config['database']['connections'][$connection]['database'] = $database;
        $config['database']['connections'][$connection]['url'] = $url;
        LoadConfiguration::alwaysUse(static fn (): array => $config);

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('Pengaman SQLite');

            $test->runSetup();
        } finally {
            LoadConfiguration::alwaysUse(null);
        }
    }

    public static function unsafeConnections(): array
    {
        return [
            'non-sqlite default' => ['mysql', ':memory:', ''],
            'file database' => ['sqlite', 'guard-fixture.sqlite', ''],
            'file override via DB_URL' => ['sqlite', ':memory:', 'sqlite:///guard-fixture.sqlite'],
        ];
    }
}
