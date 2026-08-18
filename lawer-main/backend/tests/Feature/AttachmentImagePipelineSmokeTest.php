<?php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

final class AttachmentImagePipelineSmokeTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!filter_var(env('RUN_DATABASE_TESTS', false), FILTER_VALIDATE_BOOL)) {
            $this->markTestSkipped('Set RUN_DATABASE_TESTS=true against an isolated PostgreSQL test database.');
        }
        if (!extension_loaded('imagick')) $this->markTestSkipped('Imagick is required for the image pipeline test.');
    }

    public function test_uploaded_image_is_converted_stripped_thumbnailed_and_deleted(): void
    {
        $auth = $this->registerAndVerifyClient();
        $jpeg = base64_decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=', true);
        $this->assertNotFalse($jpeg);
        $file = UploadedFile::fake()->createWithContent('receipt.jpg', $jpeg);

        $uploaded = $auth->post('/api/v1/attachments', ['file' => $file], ['Accept' => 'application/json']);
        $uploaded->assertCreated()
            ->assertJsonPath('data.mimeType', 'image/webp')
            ->assertJsonPath('data.metadataStripped', true)
            ->assertJsonPath('data.thumbnailAvailable', true);
        $id = (int) $uploaded->json('data.id');

        $auth->get('/api/v1/attachments/'.$id.'/thumbnail')->assertOk()->assertHeader('Content-Type', 'image/webp');
        $auth->deleteJson('/api/v1/attachments/'.$id)->assertOk()->assertJsonPath('data.deleted', true);
    }

    private function registerAndVerifyClient(): self
    {
        $email = 'image+'.bin2hex(random_bytes(5)).'@example.test';
        $register = $this->postJson('/api/v1/auth/register', [
            'fullName' => 'عميل صورة اختبار',
            'email' => $email,
            'password' => 'StrongPass123',
            'accountType' => 'individual',
            'agreedToTerms' => true,
        ]);
        $session = $register->getCookie(config('zdraft.session_cookie'))?->getValue();
        $csrf = $register->getCookie(config('zdraft.csrf_cookie'))?->getValue();
        $code = $register->json('data.debugVerificationCode');
        $auth = $this->withCookie(config('zdraft.session_cookie'), (string) $session)
            ->withCookie(config('zdraft.csrf_cookie'), (string) $csrf)
            ->withHeader('X-CSRF-Token', (string) $csrf);
        $auth->postJson('/api/v1/auth/email-verification/verify', ['code' => $code])->assertOk();
        return $auth;
    }
}
