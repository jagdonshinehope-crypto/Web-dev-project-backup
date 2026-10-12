<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use GuzzleHttp\Exception\GuzzleException;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use League\OAuth2\Client\Provider\GenericProvider;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'username' => strtolower(trim((string) $request->input('username'))),
            'email' => strtolower(trim((string) $request->input('email'))),
            'contact_number' => trim((string) $request->input('contact_number')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'alpha_dash:ascii', 'unique:users,username'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => [
                'required',
                'string',
                'max:25',
                'regex:/^\+?[0-9\s().-]+$/',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $digits = preg_replace('/\D/', '', (string) $value);
                    if (strlen($digits) < 7 || strlen($digits) > 15) {
                        $fail('Enter a valid contact number, including its country code when needed.');
                    }
                },
            ],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
            'password_confirmation' => ['required', 'same:password'],
            'role' => ['required', 'in:client,worker'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'],
            'password' => $data['password'],
            'role' => $data['role'],
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $this->userPayload($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The email address or password is incorrect.'],
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Signed out.']);
    }

    public function current(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user() ? $this->userPayload($request->user()) : null,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        PasswordBroker::sendResetLink(['email' => strtolower(trim($data['email']))]);

        return response()->json([
            'message' => 'If an account matches that email address, a password reset link will be sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
            'password_confirmation' => ['required', 'same:password'],
        ]);

        $status = PasswordBroker::reset($data, function (User $user, string $password): void {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();
        });

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Your password has been reset. You can now sign in.']);
    }

    public function redirectToGoogle(Request $request)
    {
        $flow = $request->query('flow', 'signin');
        if (!in_array($flow, ['signin', 'signup'], true)) {
            abort(422, 'Invalid Google sign-in flow.');
        }

        $role = null;
        if ($flow === 'signup') {
            $validated = $request->validate(['role' => ['required', 'in:client,worker']]);
            $role = $validated['role'];
        }

        $provider = $this->googleProvider();
        if (!$provider) {
            return redirect('/?auth_error=google_not_configured');
        }

        $authorizationUrl = $provider->getAuthorizationUrl([
            'scope' => ['openid', 'email', 'profile'],
            'prompt' => 'select_account',
        ]);
        $request->session()->put('google_oauth_state', $provider->getState());
        $request->session()->put('google_oauth_role', $role);

        return redirect()->away($authorizationUrl);
    }

    public function googleCallback(Request $request)
    {
        $expectedState = $request->session()->pull('google_oauth_state');
        $role = $request->session()->pull('google_oauth_role');
        if ($request->filled('error')) {
            return redirect('/?auth_error=google_cancelled');
        }
        if (!$expectedState || !$request->filled('state') || !hash_equals($expectedState, (string) $request->query('state'))) {
            return redirect('/?auth_error=google_state');
        }
        if (!$request->filled('code')) {
            return redirect('/?auth_error=google_failed');
        }

        $provider = $this->googleProvider();
        if (!$provider) {
            return redirect('/?auth_error=google_not_configured');
        }

        try {
            $token = $provider->getAccessToken('authorization_code', ['code' => $request->query('code')]);
            $identity = $provider->getResourceOwner($token)->toArray();
        } catch (IdentityProviderException|GuzzleException $exception) {
            Log::warning('Google OAuth request failed.', ['exception' => $exception::class]);
            return redirect('/?auth_error=google_failed');
        }

        $googleId = (string) ($identity['sub'] ?? $identity['id'] ?? '');
        $email = strtolower(trim((string) ($identity['email'] ?? '')));
        $emailVerified = filter_var($identity['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($googleId === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !$emailVerified) {
            return redirect('/?auth_error=google_identity');
        }

        $user = User::where('google_id', $googleId)->first();
        if (!$user) {
            if (User::where('email', $email)->exists()) {
                return redirect('/?auth_error=google_link_required');
            }
            if (!$role || !in_array($role, ['client', 'worker'], true)) {
                return redirect('/?auth=google-account-type-required');
            }

            $name = trim((string) ($identity['name'] ?? ''));
            if ($name === '') {
                $name = Str::before($email, '@');
            }
            $baseUsername = Str::lower(Str::slug(Str::before($email, '@'), '_'));
            $baseUsername = substr($baseUsername !== '' ? $baseUsername : 'googleuser', 0, 24);
            $username = $baseUsername;
            for ($suffix = 1; User::where('username', $username)->exists(); $suffix++) {
                $username = substr($baseUsername, 0, 24) . $suffix;
            }

            $user = User::create([
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'google_id' => $googleId,
                'role' => $role,
                'password' => Str::random(48),
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect('/?auth=success');
    }

    private function googleProvider(): ?GenericProvider
    {
        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');
        $redirect = config('services.google.redirect');
        if (!$clientId || !$clientSecret || !$redirect) {
            return null;
        }

        return new GenericProvider([
            'clientId' => $clientId,
            'clientSecret' => $clientSecret,
            'redirectUri' => $redirect,
            'urlAuthorize' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'urlAccessToken' => 'https://oauth2.googleapis.com/token',
            'urlResourceOwnerDetails' => 'https://openidconnect.googleapis.com/v1/userinfo',
            'scopes' => ['openid', 'email', 'profile'],
            'scopeSeparator' => ' ',
            'responseResourceOwnerId' => 'sub',
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'contact_number' => $user->contact_number,
            'role' => $user->role,
        ];
    }
}
