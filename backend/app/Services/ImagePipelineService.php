<?php
namespace App\Services;

use App\Exceptions\ApiException;

final class ImagePipelineService
{
    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    public function process(string $path, string $mime, string $originalName): array
    {
        $original = file_get_contents($path);
        if ($original === false) throw new ApiException(400, 'تعذر قراءة الملف', 'FILE_READ_FAILED');

        $base = [
            'isImage' => false,
            'canonicalBytes' => $original,
            'canonicalMime' => $mime,
            'canonicalName' => mb_substr(basename($originalName), 0, 255) ?: 'attachment',
            'width' => null,
            'height' => null,
            'metadataStripped' => false,
            'isCompressed' => false,
            'processingVersion' => null,
            'originalSizeBytes' => strlen($original),
            'originalSha256' => hash('sha256', $original),
            'originalMime' => $mime,
            'thumbnail' => null,
        ];
        if (!in_array($mime, self::IMAGE_MIMES, true)) return $base;

        try {
            if (extension_loaded('imagick') && class_exists('\Imagick')) {
                return $this->processWithImagick($original, $mime, $originalName, $base);
            }
            if (extension_loaded('gd') && function_exists('imagecreatefromstring')) {
                return $this->processWithGd($original, $mime, $originalName, $base);
            }
            return $this->processFallback($original, $path, $mime, $originalName, $base);
        } catch (ApiException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return $this->processFallback($original, $path, $mime, $originalName, $base);
        }
    }

    private function processWithImagick(string $original, string $mime, string $originalName, array $base): array
    {
        $probe = new \Imagick();
        $probe->pingImageBlob($original);
        $width = $probe->getImageWidth();
        $height = $probe->getImageHeight();
        $probe->clear();
        $this->validateDimensions($width, $height);

        $maxDimension = (int) config('zdraft.image.max_dimension', 1920);
        $quality = (int) config('zdraft.image.webp_quality', 84);
        $dimensionCandidates = array_values(array_unique([
            $maxDimension,
            max(1280, (int) floor($maxDimension * 0.84)),
            max(1080, (int) floor($maxDimension * 0.68)),
            max(800, (int) floor($maxDimension * 0.50)),
        ]));
        rsort($dimensionCandidates);
        $qualityCandidates = array_values(array_unique([
            $quality,
            max(72, $quality - 8),
            max(62, $quality - 16),
            max(52, $quality - 24),
            max(45, $quality - 32),
        ]));
        rsort($qualityCandidates);

        $canonical = null;
        $maxBytes = (int) config('zdraft.image.max_bytes', 1572864);
        foreach ($dimensionCandidates as $dimension) {
            foreach ($qualityCandidates as $candidateQuality) {
                $candidate = $this->encodeWebpImagick($original, $dimension, $candidateQuality);
                $canonical = $candidate;
                if (strlen($candidate['bytes']) <= $maxBytes) break 2;
            }
        }
        if (!$canonical || strlen($canonical['bytes']) > $maxBytes) {
            return $this->processFallback($original, null, $mime, $originalName, $base, $width, $height);
        }
        $this->validateDimensions($canonical['width'], $canonical['height']);

        $thumbnail = $this->encodeThumbnailImagick($canonical['bytes']);
        $name = (pathinfo($originalName, PATHINFO_FILENAME) ?: 'image').'.webp';
        $name = mb_substr($name, 0, 250);

        return array_merge($base, [
            'isImage' => true,
            'canonicalBytes' => $canonical['bytes'],
            'canonicalMime' => 'image/webp',
            'canonicalName' => $name,
            'width' => $canonical['width'],
            'height' => $canonical['height'],
            'metadataStripped' => true,
            'isCompressed' => true,
            'processingVersion' => 'imagick-webp-v2',
            'thumbnail' => [
                'bytes' => $thumbnail['bytes'],
                'mime' => 'image/webp',
                'name' => pathinfo($name, PATHINFO_FILENAME).'.thumb.webp',
                'width' => $thumbnail['width'],
                'height' => $thumbnail['height'],
                'sizeBytes' => strlen($thumbnail['bytes']),
                'sha256' => hash('sha256', $thumbnail['bytes']),
            ],
        ]);
    }

    private function processWithGd(string $original, string $mime, string $originalName, array $base): array
    {
        $im = @imagecreatefromstring($original);
        if (!$im) return $this->processFallback($original, null, $mime, $originalName, $base);

        $width = imagesx($im);
        $height = imagesy($im);
        $this->validateDimensions($width, $height);

        $maxDimension = (int) config('zdraft.image.max_dimension', 1920);
        $targetW = $width;
        $targetH = $height;
        if ($width > $maxDimension || $height > $maxDimension) {
            $ratio = min($maxDimension / $width, $maxDimension / $height);
            $targetW = max(1, (int) round($width * $ratio));
            $targetH = max(1, (int) round($height * $ratio));
        }

        $resized = imagecreatetruecolor($targetW, $targetH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $im, 0, 0, 0, 0, $targetW, $targetH, $width, $height);

        ob_start();
        $isWebp = function_exists('imagewebp');
        if ($isWebp) {
            imagewebp($resized, null, (int) config('zdraft.image.webp_quality', 84));
            $canonicalBytes = ob_get_clean();
            $canonicalMime = 'image/webp';
            $ext = 'webp';
        } else {
            imagejpeg($resized, null, (int) config('zdraft.image.webp_quality', 84));
            $canonicalBytes = ob_get_clean();
            $canonicalMime = 'image/jpeg';
            $ext = 'jpg';
        }
        imagedestroy($resized);

        // Thumbnail
        $thumbDim = (int) config('zdraft.image.thumbnail_dimension', 480);
        $thumbRatio = min($thumbDim / $width, $thumbDim / $height);
        $thumbW = max(1, (int) round($width * $thumbRatio));
        $thumbH = max(1, (int) round($height * $thumbRatio));
        $thumbIm = imagecreatetruecolor($thumbW, $thumbH);
        imagealphablending($thumbIm, false);
        imagesavealpha($thumbIm, true);
        imagecopyresampled($thumbIm, $im, 0, 0, 0, 0, $thumbW, $thumbH, $width, $height);
        imagedestroy($im);

        ob_start();
        if ($isWebp) {
            imagewebp($thumbIm, null, (int) config('zdraft.image.thumbnail_quality', 72));
            $thumbBytes = ob_get_clean();
            $thumbMime = 'image/webp';
        } else {
            imagejpeg($thumbIm, null, (int) config('zdraft.image.thumbnail_quality', 72));
            $thumbBytes = ob_get_clean();
            $thumbMime = 'image/jpeg';
        }
        imagedestroy($thumbIm);

        $name = (pathinfo($originalName, PATHINFO_FILENAME) ?: 'image').'.'.$ext;
        return array_merge($base, [
            'isImage' => true,
            'canonicalBytes' => $canonicalBytes,
            'canonicalMime' => $canonicalMime,
            'canonicalName' => mb_substr($name, 0, 250),
            'width' => $targetW,
            'height' => $targetH,
            'metadataStripped' => true,
            'isCompressed' => true,
            'processingVersion' => 'gd-v1',
            'thumbnail' => [
                'bytes' => $thumbBytes,
                'mime' => $thumbMime,
                'name' => pathinfo($name, PATHINFO_FILENAME).'.thumb.'.$ext,
                'width' => $thumbW,
                'height' => $thumbH,
                'sizeBytes' => strlen($thumbBytes),
                'sha256' => hash('sha256', $thumbBytes),
            ],
        ]);
    }

    private function processFallback(string $original, ?string $path, string $mime, string $originalName, array $base, ?int $knownWidth = null, ?int $knownHeight = null): array
    {
        $width = $knownWidth;
        $height = $knownHeight;
        if (!$width || !$height) {
            $info = @getimagesizefromstring($original);
            if ($info) {
                $width = $info[0] ?? null;
                $height = $info[1] ?? null;
            }
        }
        if ($width && $height) {
            $this->validateDimensions($width, $height);
        }
        return array_merge($base, [
            'isImage' => true,
            'canonicalBytes' => $original,
            'canonicalMime' => $mime,
            'canonicalName' => mb_substr(basename($originalName), 0, 255) ?: 'attachment',
            'width' => $width,
            'height' => $height,
            'metadataStripped' => false,
            'isCompressed' => false,
            'processingVersion' => 'passthrough-v1',
            'thumbnail' => null,
        ]);
    }

    private function encodeWebpImagick(string $original, int $maxDimension, int $quality): array
    {
        $image = new \Imagick();
        $image->readImageBlob($original);
        $image->setIteratorIndex(0);
        $this->autoOrient($image);
        $image->setImagePage(0, 0, 0, 0);
        $image->stripImage();
        $image->setImageColorspace(\Imagick::COLORSPACE_SRGB);
        if ($image->getImageWidth() > $maxDimension || $image->getImageHeight() > $maxDimension) {
            $image->thumbnailImage($maxDimension, $maxDimension, true, true);
        }
        $image->setImageFormat('webp');
        $image->setOption('webp:method', (string) config('zdraft.image.webp_effort', 6));
        $image->setImageCompressionQuality($quality);
        $bytes = $image->getImagesBlob();
        $result = ['bytes' => $bytes, 'width' => $image->getImageWidth(), 'height' => $image->getImageHeight()];
        $image->clear();
        return $result;
    }

    private function encodeThumbnailImagick(string $canonicalBytes): array
    {
        $thumb = new \Imagick();
        $thumb->readImageBlob($canonicalBytes);
        $thumb->setIteratorIndex(0);
        $thumb->stripImage();
        $dimension = (int) config('zdraft.image.thumbnail_dimension', 480);
        $thumb->thumbnailImage($dimension, $dimension, true, true);
        $thumb->setImageFormat('webp');
        $thumb->setOption('webp:method', (string) min((int) config('zdraft.image.webp_effort', 6), 4));
        $thumb->setImageCompressionQuality((int) config('zdraft.image.thumbnail_quality', 72));
        $bytes = $thumb->getImagesBlob();
        $result = ['bytes' => $bytes, 'width' => $thumb->getImageWidth(), 'height' => $thumb->getImageHeight()];
        $thumb->clear();
        return $result;
    }

    private function validateDimensions(int $width, int $height): void
    {
        if ($width < 1 || $height < 1) throw new ApiException(400, 'تعذر قراءة أبعاد الصورة', 'IMAGE_DIMENSIONS_INVALID');
        $pixels = $width * $height;
        $maxPixels = (int) config('zdraft.image.max_input_pixels', 40000000);
        if ($pixels > $maxPixels) throw new ApiException(400, 'أبعاد الصورة أكبر من الحد المسموح', 'IMAGE_PIXEL_LIMIT_EXCEEDED', [
            'width' => $width,
            'height' => $height,
            'maxPixels' => $maxPixels,
        ]);
    }

    private function autoOrient(\Imagick $image): void
    {
        if (method_exists($image, 'autoOrientImage')) {
            $image->autoOrientImage();
            $image->setImageOrientation(\Imagick::ORIENTATION_TOPLEFT);
            return;
        }
        switch ($image->getImageOrientation()) {
            case \Imagick::ORIENTATION_TOPRIGHT: $image->flopImage(); break;
            case \Imagick::ORIENTATION_BOTTOMRIGHT: $image->rotateImage('transparent', 180); break;
            case \Imagick::ORIENTATION_BOTTOMLEFT: $image->flipImage(); break;
            case \Imagick::ORIENTATION_LEFTTOP: $image->transposeImage(); break;
            case \Imagick::ORIENTATION_RIGHTTOP: $image->rotateImage('transparent', 90); break;
            case \Imagick::ORIENTATION_RIGHTBOTTOM: $image->transverseImage(); break;
            case \Imagick::ORIENTATION_LEFTBOTTOM: $image->rotateImage('transparent', -90); break;
        }
        $image->setImageOrientation(\Imagick::ORIENTATION_TOPLEFT);
    }
}

