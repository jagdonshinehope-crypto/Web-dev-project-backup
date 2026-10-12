<?php

namespace Tests\Feature;

use App\Models\Job;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class JobApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_worker_can_submit_application_and_only_job_client_can_view_resume(): void
    {
        Storage::fake('local');
        $client = User::factory()->create(['role' => 'client']);
        $worker = User::factory()->create(['role' => 'worker']);
        $otherClient = User::factory()->create(['role' => 'client']);
        $job = $this->createJob($client);

        $response = $this->actingAs($worker)->post('/applications', [
            'job_id' => $job->id,
            'resume' => UploadedFile::fake()->create('worker-resume.pdf', 40, 'application/pdf'),
            'response' => 'I have relevant writing experience.',
        ]);

        $response->assertCreated();
        $application = JobApplication::firstOrFail();
        $this->assertSame('pending', $application->status);
        $this->assertSame($worker->id, $application->worker_id);
        Storage::disk('local')->assertExists($application->resume_path);
        $this->assertDatabaseHas('job_applications', [
            'job_id' => $job->id,
            'worker_id' => $worker->id,
            'response' => 'I have relevant writing experience.',
        ]);

        $this->actingAs($otherClient)->get(route('applications.resume', $application))->assertForbidden();
        $this->actingAs($client)->get(route('applications.resume', $application))->assertOk();
        $this->actingAs($worker)->getJson('/applications')
            ->assertOk()
            ->assertJsonPath('applications.0.title', $job->title)
            ->assertJsonPath('applications.0.status', 'pending');
        $this->actingAs($client)->getJson('/applications')
            ->assertOk()
            ->assertJsonPath('applications.0.worker.name', $worker->name);
    }

    public function test_application_is_unique_and_only_its_client_can_accept_and_rate_the_worker(): void
    {
        Storage::fake('local');
        $client = User::factory()->create(['role' => 'client']);
        $otherClient = User::factory()->create(['role' => 'client']);
        $worker = User::factory()->create([
            'role' => 'worker',
            'profile_title' => 'Freelance Writer',
            'profile_skills' => 'Writing',
        ]);
        $job = $this->createJob($client, ['title' => 'Freelance Writer']);

        $this->actingAs($worker)->post('/applications', [
            'job_id' => $job->id,
            'resume' => UploadedFile::fake()->create('resume.docx', 20, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertCreated();
        $application = JobApplication::firstOrFail();

        $this->actingAs($worker)->post('/applications', [
            'job_id' => $job->id,
            'resume' => UploadedFile::fake()->create('resume.pdf', 20, 'application/pdf'),
        ])->assertUnprocessable();

        $this->actingAs($otherClient)->patchJson("/applications/{$application->id}/status", ['status' => 'accepted'])
            ->assertForbidden();
        $this->actingAs($client)->patchJson("/applications/{$application->id}/status", ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('application.status', 'accepted');

        $this->actingAs($client)->putJson("/applications/{$application->id}/rating", ['rating' => 5])
            ->assertOk()
            ->assertJsonPath('application.rating', 5);

        $this->actingAs($client)->getJson('/workers?skill=Freelance%20Writer')
            ->assertOk()
            ->assertJsonPath('hired.0.name', $worker->name)
            ->assertJsonPath('hired.0.job_title', 'Freelance Writer')
            ->assertJsonPath('hired.0.rating', 5);

        $this->actingAs(User::factory()->create(['role' => 'worker']))
            ->putJson("/applications/{$application->id}/rating", ['rating' => 3])
            ->assertForbidden();

        $this->assertSame('accepted', $application->fresh()->status);
        $this->assertSame(5, $application->fresh()->rating);
    }

    private function createJob(User $client, array $overrides = []): Job
    {
        return Job::create([
            'client_id' => $client->id,
            'title' => 'Freelance Writer',
            'category' => 'Content & Social Media',
            'location' => 'Remote',
            'type' => 'gig',
            'salary' => '$200',
            'company' => $client->name,
            'description' => 'Write articles for the client.',
            'tags' => ['Writing'],
            'application_method' => 'direct',
            ...$overrides,
        ]);
    }
}
