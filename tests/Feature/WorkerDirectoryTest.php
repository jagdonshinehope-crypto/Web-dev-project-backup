<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkerDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_browse_workers_by_profile_title_or_skills(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $byTitle = User::factory()->create([
            'role' => 'worker',
            'profile_title' => 'Virtual Assistant',
            'profile_skills' => 'Calendar management',
        ]);
        $bySkill = User::factory()->create([
            'role' => 'worker',
            'profile_title' => 'Office Assistant',
            'profile_skills' => 'Virtual Assistant, Data Entry',
        ]);
        User::factory()->create([
            'role' => 'worker',
            'profile_title' => 'Graphic Designer',
            'profile_skills' => 'Figma, Photoshop',
        ]);

        $this->actingAs($client)
            ->getJson('/workers?skill=Virtual%20Assistant')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonCount(2, 'workers')
            ->assertJsonFragment(['id' => $byTitle->id, 'title' => 'Virtual Assistant'])
            ->assertJsonFragment(['id' => $bySkill->id, 'skills' => 'Virtual Assistant, Data Entry'])
            ->assertJsonMissingPath('workers.0.email');
    }

    public function test_saved_worker_profile_details_appear_in_the_client_directory(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);
        $this->actingAs($worker)->patchJson('/profile', [
            'name' => $worker->name,
            'title' => 'Virtual Assistant',
            'skills' => 'Calendar management',
            'education' => 'Example College',
            'description' => 'Experienced virtual assistant.',
        ])->assertOk();

        $client = User::factory()->create(['role' => 'client']);
        $this->actingAs($client)
            ->getJson('/workers?skill=Virtual%20Assistant')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $worker->id,
                'title' => 'Virtual Assistant',
                'skills' => 'Calendar management',
            ]);
    }

    public function test_workers_cannot_browse_the_worker_directory(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker)
            ->getJson('/workers?skill=Virtual%20Assistant')
            ->assertForbidden();
    }

    public function test_guests_cannot_browse_the_worker_directory(): void
    {
        $this->getJson('/workers?skill=Virtual%20Assistant')
            ->assertUnauthorized();
    }

    public function test_worker_directory_rejects_invalid_skill_searches(): void
    {
        $client = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)
            ->getJson('/workers?skill=%25')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('skill');
    }

    public function test_client_can_view_a_worker_profile_picture(): void
    {
        Storage::fake('local');
        $client = User::factory()->create(['role' => 'client']);
        $worker = User::factory()->create([
            'role' => 'worker',
            'profile_picture_path' => 'profile-pictures/worker/profile.jpg',
        ]);
        Storage::disk('local')->put($worker->profile_picture_path, 'test image');

        $this->actingAs($client)
            ->get(route('workers.avatar', ['user' => $worker->id]))
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_workers_cannot_view_another_workers_profile_picture(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);
        $anotherWorker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker)
            ->get(route('workers.avatar', ['user' => $anotherWorker->id]))
            ->assertForbidden();
    }

    public function test_guests_cannot_view_worker_profile_pictures(): void
    {
        $anotherWorker = User::factory()->create(['role' => 'worker']);

        $this->get(route('workers.avatar', ['user' => $anotherWorker->id]))
            ->assertNotFound();
    }
}
