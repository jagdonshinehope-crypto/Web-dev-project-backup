<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'profile' => [
                'name' => $user->name,
                'title' => $user->profile_title ?? '',
                'skills' => $user->profile_skills ?? '',
                'education' => $user->profile_education ?? '',
                'description' => $user->profile_description ?? '',
                'avatar_url' => $user->profile_picture_path
                    ? route('profile.avatar', ['v' => $user->updated_at?->timestamp])
                    : null,
            ],
            'verification' => [
                'status' => $user->verification_status ?? 'not_submitted',
                'submitted_at' => $user->verification_submitted_at?->toIso8601String(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:120'],
            'skills' => ['nullable', 'string', 'max:500'],
            'education' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $user->name = $data['name'];
        $user->profile_title = $data['title'] ?? '';
        $user->profile_skills = $data['skills'] ?? '';
        $user->profile_education = $data['education'] ?? '';
        $user->profile_description = $data['description'] ?? '';
        $user->save();

        return $this->show($request);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,jfif,png,webp', 'max:2048'],
        ]);

        $path = $data['avatar']->store('profile-pictures/'.$user->id, 'local');
        if (!$path) {
            throw new RuntimeException('The profile picture could not be stored.');
        }

        $previousPath = $user->profile_picture_path;
        $user->profile_picture_path = $path;
        $user->save();

        if ($previousPath && Storage::disk('local')->exists($previousPath)
            && !Storage::disk('local')->delete($previousPath)) {
            throw new RuntimeException('The new profile picture was saved, but the previous picture could not be removed.');
        }

        return response()->json([
            'avatar_url' => route('profile.avatar', ['v' => $user->fresh()->updated_at?->timestamp]),
            'message' => 'Profile picture updated.',
        ]);
    }

    public function avatar(Request $request): StreamedResponse
    {
        $path = $request->user()?->profile_picture_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function verification(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'worker', 403, 'Only worker accounts can submit identity documents.');

        return response()->json([
            'status' => $request->user()->verification_status ?? 'not_submitted',
            'submitted_at' => $request->user()->verification_submitted_at?->toIso8601String(),
        ]);
    }

    public function uploadVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'worker', 403, 'Only worker accounts can submit identity documents.');

        $data = $request->validate([
            'document' => ['required', 'file', 'mimes:jpg,jpeg,jfif,png,pdf', 'extensions:jpg,jpeg,jfif,png,pdf', 'max:5120'],
        ]);

        $path = $data['document']->store('identity-documents/'.$user->id, 'local');
        if (!$path) {
            throw new RuntimeException('The identity document could not be stored.');
        }

        if ($user->verification_document_path && Storage::disk('local')->exists($user->verification_document_path)) {
            if (!Storage::disk('local')->delete($user->verification_document_path)) {
                Storage::disk('local')->delete($path);
                throw new RuntimeException('The previous identity document could not be replaced.');
            }
        }

        $user->verification_document_path = $path;
        $user->verification_status = 'pending';
        $user->verification_submitted_at = now();
        $user->save();

        return response()->json([
            'status' => $user->verification_status,
            'submitted_at' => $user->verification_submitted_at->toIso8601String(),
            'message' => 'Your identity document was submitted securely for review.',
        ]);
    }
}
