<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\File;
use RuntimeException;

final class AtomicJsonFile
{
    public static function write(string $path, array $data): void
    {
        $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $directory = dirname($path);
        File::ensureDirectoryExists($directory);
        $temporary = @tempnam($directory, 'snapshot-');
        if ($temporary === false) {
            throw new RuntimeException('Gagal membuat berkas sementara untuk snapshot.');
        }

        try {
            if (realpath(dirname($temporary)) !== realpath($directory)
                || File::put($temporary, $json) !== strlen($json) || ! @rename($temporary, $path)) {
                throw new RuntimeException('Gagal mengganti berkas snapshot.');
            }
        } finally {
            if (is_file($temporary)) {
                File::delete($temporary);
            }
        }
    }
}
