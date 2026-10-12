<?php

namespace Tests\Feature;

use App\Models\Job;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobBoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_post_a_job_that_appears_in_the_worker_board(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $worker = User::factory()->create(['role' => 'worker']);

        $created = $this->actingAs($client)->postJson('/jobs', [
            'title' => 'Virtual Assistant',
            'category' => 'Admin & Virtual Assistants',
            'location' => 'Remote',
            'type' => 'parttime',
            'salary' => '$20/hour',
            'description' => 'Manage calendars and email.',
            'tags' => ['Communication', 'Microsoft Office'],
            'application_instructions' => 'Send your resume.',
            'application_method' => 'direct',
            'application_question' => '',
        ])->assertCreated()
            ->assertJsonPath('job.title', 'Virtual Assistant')
            ->assertJsonPath('job.ownerId', $client->id)
            ->assertJsonPath('job.cat', 'Admin & Virtual Assistants');

        $this->assertDatabaseHas('posted_jobs', [
            'id' => $created->json('job.id'),
            'client_id' => $client->id,
            'title' => 'Virtual Assistant',
        ]);

        $this->actingAs($worker)
            ->getJson('/jobs')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $created->json('job.id'),
                'title' => 'Virtual Assistant',
                'company' => $client->name,
            ]);
    }

    public function test_only_clients_can_create_jobs(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker)
            ->postJson('/jobs', [])
            ->assertForbidden();
    }

    public function test_job_application_questions_are_required_for_form_applications(): void
    {
        $client = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)
            ->postJson('/jobs', [
                'title' => 'Content Writer',
                'category' => 'Content & Social Media',
                'location' => 'Remote',
                'type' => 'gig',
                'salary' => '$100',
                'description' => 'Write a short article.',
                'application_method' => 'form',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('application_question');

        $this->assertSame(0, Job::count());
    }
}
