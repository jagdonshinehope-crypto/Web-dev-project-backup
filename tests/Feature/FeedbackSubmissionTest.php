<?php

namespace Tests\Feature;

use App\Models\FeedbackEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedbackSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_client_can_submit_feedback(): void
    {
        $client = User::factory()->create(['role' => 'client']);

        $response = $this->actingAs($client)
            ->postJson('/feedback', [
                'category' => 'suggestion',
                'rating' => 4,
                'message' => 'The job search filters are useful.',
            ])
            ->assertCreated()
            ->assertJsonPath('message', 'Thank you for your feedback.');

        $this->assertDatabaseHas('feedback_entries', [
            'id' => $response->json('id'),
            'user_id' => $client->id,
            'category' => 'suggestion',
            'rating' => 4,
            'message' => 'The job search filters are useful.',
        ]);
    }

    public function test_feedback_requires_authentication(): void
    {
        $this->postJson('/feedback', [
            'category' => 'general',
            'rating' => 5,
            'message' => 'I like using FlexWork.',
        ])->assertUnauthorized();
    }

    public function test_feedback_validates_category_rating_and_message(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker)
            ->postJson('/feedback', [
                'category' => 'other',
                'rating' => 8,
                'message' => 'Short',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category', 'rating', 'message']);

        $this->assertSame(0, FeedbackEntry::count());
    }
}
