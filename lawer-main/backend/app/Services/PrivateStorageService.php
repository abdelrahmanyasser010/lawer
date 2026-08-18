<?php
namespace App\Services;
use App\Exceptions\ApiException;
use Illuminate\Support\Facades\Storage;
final class PrivateStorageService
{
    public function key(string $prefix, string $originalName, ?string $forcedExtension = null): string
    {
        $safePrefix = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($prefix)) ?: 'file';
        $extension = $forcedExtension ?: strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $extension = preg_replace('/[^a-z0-9]+/', '', $extension ?? '');
        $suffix = $extension ? '.'.$extension : '';
        return sprintf('%s/%s/%s/%s/%s%s', $safePrefix, gmdate('Y'), gmdate('m'), gmdate('d'), bin2hex(random_bytes(18)), $suffix);
    }
    public function put(string $key, string $bytes): array
    {
        Storage::disk('private')->put($key, $bytes);
        return ['key' => $key, 'sizeBytes' => strlen($bytes), 'sha256' => hash('sha256', $bytes)];
    }
    public function path(string $key): string
    {
        if (str_contains($key, '..') || str_contains($key, "\0")) throw new ApiException(400, 'مسار الملف غير صالح', 'INVALID_STORAGE_KEY');
        return Storage::disk('private')->path($key);
    }
    public function delete(?string $key): void
    {
        if ($key) Storage::disk('private')->delete($key);
    }
}
