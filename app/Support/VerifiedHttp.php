<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

final class VerifiedHttp
{
    public static function request(): PendingRequest
    {
        $bundle = config('services.uma_http.ca_bundle');
        if (is_string($bundle) && $bundle !== '') {
            if (! is_file($bundle) || ! is_readable($bundle)) {
                throw new RuntimeException('Bundel CA pada UMA_HTTP_CA_BUNDLE tidak dapat dibaca.');
            }

            return Http::withOptions(['verify' => $bundle]);
        }

        return Http::withOptions(['verify' => true]);
    }

    public static function errorMessage(Throwable $error): string
    {
        $message = $error->getMessage();
        if (preg_match('/cURL error (?:51|60|77)\b|certificate verify failed|unable to get local issuer certificate/i', $message)) {
            return 'Verifikasi sertifikat TLS gagal. Atur bundel CA tepercaya melalui UMA_HTTP_CA_BUNDLE atau curl.cainfo pada php.ini.';
        }

        return $message;
    }
}
