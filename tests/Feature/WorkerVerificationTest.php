<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkerVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function fakePng(): UploadedFile
    {
        $content = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
            true
        );

        return UploadedFile::fake()->createWithContent('profile.png', $content);
    }

    private function fakeJfif(): UploadedFile
    {
        $content = base64_decode(
            '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAA//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKf/2Q==',
            true
        );

        return UploadedFile::fake()->createWithContent('profile.jfif', $content);
    }

    public function test_worker_can_submit_an_id_for_private_review(): void
    {
        Storage::fake('local');
        $worker = User::factory()->create(['role' => 'worker']);

        $response = $this->actingAs($worker)->postJson('/profile/verification', [
            'document' => UploadedFile::fake()->create('school-id.pdf', 200, 'application/pdf'),
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonMissingPath('document_path');

        $path = $worker->fresh()->verification_document_path;
        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);
        $this->assertStringStartsWith('identity-documents/'.$worker->id.'/', $path);
    }

    public function test_worker_can_submit_a_jfif_school_id_for_private_review(): void
    {
        Storage::fake('local');
        $worker = User::factory()->create(['role' => 'worker']);

        $response = $this->actingAs($worker)->postJson('/profile/verification', [
            'document' => $this->fakeJfif(),
        ]);

        $response->assertOk()->assertJsonPath('status', 'pending');
        Storage::disk('local')->assertExists($worker->fresh()->verification_document_path);
    }

    public function test_client_cannot_submit_an_identity_document(): void
    {
        $client = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)->postJson('/profile/verification', [
            'document' => UploadedFile::fake()->create('id.pdf', 200, 'application/pdf'),
        ])->assertForbidden();
    }

    public function test_guest_cannot_submit_an_identity_document(): void
    {
        $this->postJson('/profile/verification', [
            'document' => UploadedFile::fake()->create('id.pdf', 200, 'application/pdf'),
        ])->assertUnauthorized();
    }

    public function test_worker_profile_fields_are_saved_to_their_account(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker)->patchJson('/profile', [
            'name' => 'Alex Worker',
            'title' => 'Junior Web Developer',
            'skills' => 'JavaScript, PHP',
            'education' => 'Example College, BS Information Technology',
            'description' => 'A detail-oriented developer with experience building web apps.',
        ])->assertOk()
            ->assertJsonPath('profile.education', 'Example College, BS Information Technology')
            ->assertJsonPath('profile.description', 'A detail-oriented developer with experience building web apps.');

        $this->assertSame('Alex Worker', $worker->fresh()->name);
        $this->assertSame('JavaScript, PHP', $worker->fresh()->profile_skills);
    }

    public function test_signed_in_user_can_upload_and_view_their_private_profile_picture(): void
    {
        Storage::fake('local');
        $worker = User::factory()->create(['role' => 'worker']);

        $response = $this->actingAs($worker)->postJson('/profile/avatar', [
            'avatar' => $this->fakePng(),
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Profile picture updated.')
            ->assertJsonStructure(['avatar_url']);
        $this->assertStringStartsWith(route('profile.avatar'), $response->json('avatar_url'));

        $path = $worker->fresh()->profile_picture_path;
        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);

        $this->get('/profile/avatar')->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_guest_cannot_upload_or_view_a_profile_picture(): void
    {
        $this->postJson('/profile/avatar', [
            'avatar' => UploadedFile::fake()->create('profile.png', 100, 'image/png'),
        ])->assertUnauthorized();

        $this->get('/profile/avatar')->assertNotFound();
    }

    public function test_profile_picture_upload_rejects_non_image_files(): void
    {
        Storage::fake('local');
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker)->postJson('/profile/avatar', [
            'avatar' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('avatar');

        $this->assertNull($worker->fresh()->profile_picture_path);
    }

    public function test_profile_picture_upload_accepts_jfif_files(): void
    {
        Storage::fake('local');
        $worker = User::factory()->create(['role' => 'worker']);

        $response = $this->actingAs($worker)->postJson('/profile/avatar', [
            'avatar' => $this->fakeJfif(),
        ]);

        $response->assertOk();
        Storage::disk('local')->assertExists($worker->fresh()->profile_picture_path);
    }
}
