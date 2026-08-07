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
            $probe = new \Imagick();
            $probe->pingImageBlob($original);
            $width = $probe->getImageWidth();
            $height = $probe->getImageHeight();
            $probe->clear();
            $this->validateDimensions($width, $height);

            $maxDimension = (int) config('zdraft.image.max_dimension');
            $quality = (int) config('zdraft.image.webp_quality');
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
            foreach ($dimensionCandidates as $dimension) {
                foreach ($qualityCandidates as $candidateQuality) {
                    $candidate = $this->encodeWebp($original, $dimension, $candidateQuality);
                    $canonical = $candidate;
                    if (strlen($candidate['bytes']) <= (int) config('zdraft.image.max_bytes')) break 2;
                }
            }
            if (!$canonical || strlen($canonical['bytes']) > (int) config('zdraft.image.max_bytes')) {
                throw new ApiException(400, 'تعذر ضغط الصورة إلى الحجم الآمن المطلوب', 'IMAGE_OUTPUT_LIMIT_EXCEEDED', [
                    'outputBytes' => $canonical ? strlen($canonical['bytes']) : null,
                    'maxOutputBytes' => (int) config('zdraft.image.max_bytes'),
                ]);
            }
            $this->validateDimensions($canonical['width'], $canonical['height']);

            $thumbnail = $this->encodeThumbnail($canonical['bytes']);
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
        } catch (ApiException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new ApiException(400, 'تعذر معالجة الصورة أو أنها تالفة', 'IMAGE_PROCESSING_FAILED', ['error' => $e->getMessage()]);
        }
    }

    private function encodeWebp(string $original, int $maxDimension, int $quality): array
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
        $image->setOption('webp:method', (string) config('zdraft.image.webp_effort'));
        $image->setImageCompressionQuality($quality);
        $bytes = $image->getImagesBlob();
        $result = ['bytes' => $bytes, 'width' => $image->getImageWidth(), 'height' => $image->getImageHeight()];
        $image->clear();
        return $result;
    }

    private function encodeThumbnail(string $canonicalBytes): array
    {
        $thumb = new \Imagick();
        $thumb->readImageBlob($canonicalBytes);
        $thumb->setIteratorIndex(0);
        $thumb->stripImage();
        $dimension = (int) config('zdraft.image.thumbnail_dimension');
        $thumb->thumbnailImage($dimension, $dimension, true, true);
        $thumb->setImageFormat('webp');
        $thumb->setOption('webp:method', (string) min((int) config('zdraft.image.webp_effort'), 4));
        $thumb->setImageCompressionQuality((int) config('zdraft.image.thumbnail_quality'));
        $bytes = $thumb->getImagesBlob();
        $result = ['bytes' => $bytes, 'width' => $thumb->getImageWidth(), 'height' => $thumb->getImageHeight()];
        $thumb->clear();
        return $result;
    }

    private function validateDimensions(int $width, int $height): void
    {
        if ($width < 1 || $height < 1) throw new ApiException(400, 'تعذر قراءة أبعاد الصورة', 'IMAGE_DIMENSIONS_INVALID');
        $pixels = $width * $height;
        $maxPixels = (int) config('zdraft.image.max_input_pixels');
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
