<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_messages_are_delivered_to_a_worker_and_can_be_replied_to(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $worker = User::factory()->create(['role' => 'worker']);

        $sent = $this->actingAs($client)
            ->postJson('/messages', [
                'recipient_id' => $worker->id,
                'body' => 'Are you available for this role?',
            ])
            ->assertCreated()
            ->assertJsonPath('message.mine', true);

        $this->assertDatabaseHas('messages', [
            'id' => $sent->json('message.id'),
            'sender_id' => $client->id,
            'recipient_id' => $worker->id,
            'body' => 'Are you available for this role?',
        ]);

        $this->actingAs($worker)
            ->getJson("/messages/{$client->id}")
            ->assertOk()
            ->assertJsonPath('contact.id', $client->id)
            ->assertJsonPath('messages.0.body', 'Are you available for this role?')
            ->assertJsonPath('messages.0.mine', false);

        $this->assertNotNull(Message::find($sent->json('message.id'))->read_at);

        $this->actingAs($worker)
            ->postJson('/messages', [
                'recipient_id' => $client->id,
                'body' => 'Yes, I am interested.',
            ])
            ->assertCreated()
            ->assertJsonPath('message.mine', true);

        $this->actingAs($client)
            ->getJson('/messages')
            ->assertOk()
            ->assertJsonPath('conversations.0.id', $worker->id)
            ->assertJsonPath('conversations.0.last_message', 'Yes, I am interested.')
            ->assertJsonPath('conversations.0.unread_count', 1);
    }

    public function test_messages_cannot_be_sent_between_accounts_with_the_same_role(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $anotherClient = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)
            ->postJson('/messages', [
                'recipient_id' => $anotherClient->id,
                'body' => 'Hello.',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_message_bodies_must_not_be_blank(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($client)
            ->postJson('/messages', [
                'recipient_id' => $worker->id,
                'body' => '   ',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }
}
