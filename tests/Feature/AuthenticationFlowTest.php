<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthenticationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_validates_persists_and_authenticates_a_client_or_worker(): void
    {
        $response = $this->postJson('/auth/register', [
            'name' => '  Jordan Example  ',
            'username' => 'jordan_example',
            'email' => 'JORDAN@example.com',
            'contact_number' => '+63 (917) 123-4567',
            'password' => 'securepass123',
            'password_confirmation' => 'securepass123',
            'role' => 'worker',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.name', 'Jordan Example')
            ->assertJsonPath('user.username', 'jordan_example')
            ->assertJsonPath('user.email', 'jordan@example.com')
            ->assertJsonPath('user.contact_number', '+63 (917) 123-4567')
            ->assertJsonPath('user.role', 'worker');

        $user = User::where('email', 'jordan@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('securepass123', $user->password));
    }

    public function test_registration_rejects_duplicate_identity_invalid_phone_and_privileged_roles(): void
    {
        User::factory()->create([
            'username' => 'taken_name',
            'email' => 'taken@example.com',
        ]);
        $attributes = [
            'name' => 'Valid User',
            'username' => 'taken_name',
            'email' => 'taken@example.com',
            'contact_number' => '123',
            'password' => 'securepass123',
            'password_confirmation' => 'securepass123',
            'role' => 'admin',
        ];

        $this->postJson('/auth/register', $attributes)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username', 'email', 'contact_number', 'role']);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_login_and_logout_use_the_existing_session_guard(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('securepass123'),
            'role' => 'client',
        ]);

        $this->postJson('/auth/login', [
            'email' => ' LOGIN@example.com ',
            'password' => 'securepass123',
        ])->assertOk()->assertJsonPath('user.role', 'client');
        $this->assertAuthenticatedAs($user);

        $this->postJson('/auth/logout')->assertOk();
        $this->assertGuest();

        $this->postJson('/auth/login', [
            'email' => 'login@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_password_reset_uses_a_generic_response_and_resets_the_password(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset@example.com']);

        $expectedMessage = 'If an account matches that email address, a password reset link will be sent.';
        $this->postJson('/auth/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', $expectedMessage);
        $this->postJson('/auth/forgot-password', ['email' => 'missing@example.com'])
            ->assertOk()
            ->assertJsonPath('message', $expectedMessage);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;
            return true;
        });
        $this->assertNotEmpty($token);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);

        $this->postJson('/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'newsecurepass456',
            'password_confirmation' => 'newsecurepass456',
        ])->assertOk();

        $this->assertTrue(Hash::check('newsecurepass456', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_google_login_requires_configuration_and_google_signup_requires_a_role(): void
    {
        config([
            'services.google.client_id' => null,
            'services.google.client_secret' => null,
            'services.google.redirect' => null,
        ]);

        $this->get('/auth/google')
            ->assertRedirect('/?auth_error=google_not_configured');
        $this->get('/auth/google?flow=signup')
            ->assertSessionHasErrors('role');

        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-client-secret',
            'services.google.redirect' => 'http://localhost/auth/google/callback',
        ]);
        $this->get('/auth/google?flow=signup&role=client')
            ->assertRedirect()
            ->assertRedirectContains('accounts.google.com');
        $this->assertNotEmpty(session('google_oauth_state'));
        $this->assertSame('client', session('google_oauth_role'));
        $this->get('/auth/google/callback?state=invalid&code=fake')
            ->assertRedirect('/?auth_error=google_state');
    }
}
