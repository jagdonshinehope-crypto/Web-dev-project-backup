<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\JobApplication;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkerDirectoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'client', 403, 'Only client accounts can browse worker profiles.');

        $data = $request->validate([
            'skill' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9 .&+-]+$/'],
        ]);
        $term = '%'.$data['skill'].'%';

        $workers = User::query()
            ->where('role', 'worker')
            ->where(function (Builder $query) use ($term): void {
                $query->where('profile_title', 'like', $term)
                    ->orWhere('profile_skills', 'like', $term);
            })
            ->orderByDesc('updated_at')
            ->limit(36)
            ->get([
                'id',
                'name',
                'profile_title',
                'profile_skills',
                'profile_education',
                'profile_description',
                'profile_picture_path',
                'birth_date',
                'gender',
                'birthplace',
            ])
            ->map(fn (User $worker): array => [
                'id' => $worker->id,
                'name' => $worker->name,
                'title' => $worker->profile_title,
                'skills' => $worker->profile_skills,
                'education' => $worker->profile_education,
                'description' => $worker->profile_description,
                'age' => $worker->birth_date?->age,
                'gender' => $worker->gender,
                'location' => $worker->birthplace,
                'avatar_url' => $worker->profile_picture_path
                    ? route('workers.avatar', ['user' => $worker->id])
                    : null,
                'rating_average' => $worker->applicationsReceived()->whereNotNull('rating')->avg('rating'),
                'rating_count' => $worker->applicationsReceived()->whereNotNull('rating')->count(),
            ])
            ->values();

        $hired = JobApplication::query()
            ->with([
                'job:id,title,category,client_id',
                'worker:id,name,profile_title,profile_skills,profile_education,profile_description,profile_picture_path,birth_date,gender,birthplace',
            ])
            ->where('status', 'accepted')
            ->whereHas('job', fn (Builder $query) => $query
                ->where('client_id', $request->user()->id)
                ->where(fn (Builder $matches) => $matches
                    ->where('title', 'like', $term)
                    ->orWhere('category', 'like', $term)))
            ->latest()
            ->get()
            ->map(fn (JobApplication $application): array => [
                'application_id' => $application->id,
                'job_title' => $application->job->title,
                'id' => $application->worker->id,
                'name' => $application->worker->name,
                'title' => $application->worker->profile_title,
                'skills' => $application->worker->profile_skills,
                'education' => $application->worker->profile_education,
                'description' => $application->worker->profile_description,
                'age' => $application->worker->birth_date?->age,
                'gender' => $application->worker->gender,
                'location' => $application->worker->birthplace,
                'avatar_url' => $application->worker->profile_picture_path
                    ? route('workers.avatar', ['user' => $application->worker->id])
                    : null,
                'rating' => $application->rating,
                'rating_average' => $application->worker->applicationsReceived()->whereNotNull('rating')->avg('rating'),
                'rating_count' => $application->worker->applicationsReceived()->whereNotNull('rating')->count(),
            ])
            ->values();

        return response()->json(['workers' => $workers, 'hired' => $hired])
            ->header('Cache-Control', 'private, no-store');
    }

    public function avatar(Request $request, User $user): StreamedResponse
    {
        $client = $request->user();
        abort_unless($client, 404);
        abort_unless($client->role === 'client', 403, 'Only client accounts can view worker profile pictures.');
        abort_unless($user->role === 'worker', 404);

        $path = $user->profile_picture_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }
}
