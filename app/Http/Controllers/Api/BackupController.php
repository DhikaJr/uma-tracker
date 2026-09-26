<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class BackupController extends Controller
{
    public function __construct(
        protected BackupService $backupService
    ) {}

    /**
     * Get live statistics of all records available for backup.
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'stats' => $this->backupService->stats(),
        ]);
    }

    /**
     * Export database backup as a downloadable JSON file.
     */
    public function export(Request $request): Response
    {
        $backup = $this->backupService->export();
        $filename = 'uma-companion-backup-'.now()->format('Y-m-d_His').'.json';
        $json = json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($request->boolean('download', true)) {
            return response($json, 200, [
                'Content-Type' => 'application/json',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Pragma' => 'no-cache',
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Expires' => '0',
            ]);
        }

        return response()->json($backup);
    }

    /**
     * Import and restore database from uploaded JSON backup file or payload.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['nullable', 'file', 'max:51200'], // max 50MB
            'mode' => ['nullable', 'string', 'in:merge,overwrite'],
            'data' => ['nullable', 'array'],
        ]);

        $mode = $request->input('mode', 'merge');
        $backupData = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $content = file_get_contents($file->getRealPath());
            $backupData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($backupData)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File yang diunggah bukan file JSON yang valid: '.json_last_error_msg(),
                ], 422);
            }
        } elseif ($request->has('data')) {
            $backupData = $request->input('data');
        } elseif ($request->isJson()) {
            $backupData = $request->json()->all();
        }

        if (! is_array($backupData)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data backup yang dikirimkan. Silakan unggah file JSON backup.',
            ], 422);
        }

        try {
            $result = $this->backupService->import($backupData, $mode);

            return response()->json([
                'success' => true,
                'message' => 'Data berhasil dipulihkan (mode: '.($mode === 'overwrite' ? 'Ganti Semua' : 'Gabungkan').')!',
                'summary' => $result['restored'],
                'mode' => $mode,
                'unresolved_references' => $result['unresolved_references'] ?? [],
                'conflicts' => $result['conflicts'] ?? [],
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi backup gagal: '.$e->getMessage(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memulihkan data: '.$e->getMessage(),
            ], 500);
        }
    }
}
