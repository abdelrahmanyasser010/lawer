<?php
namespace App\Services;
use App\Exceptions\ApiException;
use Symfony\Component\Process\Process;
final class FileSecurityService
{
    public const ALLOWED = [
        'application/pdf' => ['pdf'],
        'image/jpeg' => ['jpg','jpeg'],
        'image/png' => ['png'],
        'image/webp' => ['webp'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
    ];
    public function inspect(string $path, string $clientMime, string $originalName): string
    {
        $detected = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
        if (!isset(self::ALLOWED[$detected])) throw new ApiException(400, 'نوع الملف غير مسموح', 'FILE_TYPE_NOT_ALLOWED', ['detectedMime' => $detected]);
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($extension, self::ALLOWED[$detected], true)) throw new ApiException(400, 'امتداد الملف لا يطابق محتواه الحقيقي', 'FILE_SIGNATURE_MISMATCH');
        if (config('zdraft.clamav.enabled')) {
            $process = new Process([config('zdraft.clamav.binary'), '--no-summary', $path]);
            $process->setTimeout(60);
            $process->run();
            if ($process->getExitCode() === 1) throw new ApiException(400, 'تم رفض الملف لاكتشاف محتوى ضار', 'MALWARE_DETECTED');
            if (!$process->isSuccessful()) throw new ApiException(503, 'تعذر فحص الملف أمنيًا', 'MALWARE_SCANNER_UNAVAILABLE');
        }
        return $detected;
    }
}
