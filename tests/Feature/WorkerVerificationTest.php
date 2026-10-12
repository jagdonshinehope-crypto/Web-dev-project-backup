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

    public function test_client_can_submit_id_and_workers_can_view_only_the_client_profile_proof_route(): void
    {
        Storage::fake('local');
        $client = User::factory()->create([
            'role' => 'client',
            'birth_date' => '1990-02-03',
            'gender' => 'Woman',
            'birthplace' => 'Cebu City',
            'profile_description' => 'I hire for remote projects.',
        ]);
        $worker = User::factory()->create(['role' => 'worker']);

        $upload = $this->actingAs($client)->postJson('/profile/verification', [
            'document' => $this->fakePng(),
            'preview' => $this->fakePng(),
        ]);
        $upload->assertOk()->assertJsonPath('status', 'pending');

        $profile = $this->actingAs($worker)->getJson('/clients/'.$client->id.'/profile');
        $profile->assertOk()
            ->assertJsonPath('profile.name', $client->name)
            ->assertJsonPath('profile.gender', 'Woman')
            ->assertJsonPath('profile.location', 'Cebu City')
            ->assertJsonPath('profile.overview', 'I hire for remote projects.')
            ->assertJsonPath('profile.id_proof_available', true)
            ->assertJsonMissingPath('profile.birth_date');

        $this->assertNotSame(
            $client->fresh()->verification_document_path,
            $client->fresh()->verification_preview_path,
        );
        Storage::disk('local')->assertExists($client->fresh()->verification_document_path);
        Storage::disk('local')->assertExists($client->fresh()->verification_preview_path);
        $proofUrl = $profile->json('profile.id_proof_url');
        $this->get($proofUrl)->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->actingAs($client)->getJson('/clients/'.$client->id.'/profile')->assertForbidden();
        $this->actingAs($client)->get($proofUrl)->assertForbidden();
    }

    public function test_guest_cannot_view_a_client_identity_proof(): void
    {
        $client = User::factory()->create(['role' => 'client']);

        $this->getJson('/clients/'.$client->id.'/profile')->assertUnauthorized();
        $this->getJson('/clients/'.$client->id.'/id-proof')->assertUnauthorized();
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
            'birth_date' => '1995-06-10',
            'gender' => 'Non-binary',
            'birthplace' => 'Davao City',
        ])->assertOk()
            ->assertJsonPath('profile.education', 'Example College, BS Information Technology')
            ->assertJsonPath('profile.description', 'A detail-oriented developer with experience building web apps.')
            ->assertJsonPath('profile.birth_date', '1995-06-10')
            ->assertJsonPath('profile.gender', 'Non-binary')
            ->assertJsonPath('profile.birthplace', 'Davao City');

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
