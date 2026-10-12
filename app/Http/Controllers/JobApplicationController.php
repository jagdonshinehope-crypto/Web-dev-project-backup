<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class JobApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['client', 'worker'], true), 403);

        $applications = JobApplication::query()
            ->with(['job:id,client_id,title,category,company', 'worker:id,name,profile_title,profile_skills,profile_education,profile_description,profile_picture_path,birth_date,gender,birthplace'])
            ->when($user->role === 'client', fn ($query) => $query->whereHas('job', fn ($jobs) => $jobs->where('client_id', $user->id)))
            ->when($user->role === 'worker', fn ($query) => $query->where('worker_id', $user->id))
            ->latest()
            ->limit(300)
            ->get();
        $ratings = JobApplication::query()
            ->selectRaw('worker_id, AVG(rating) as average, COUNT(rating) as ratings_count')
            ->whereIn('worker_id', $applications->pluck('worker_id')->unique())
            ->whereNotNull('rating')
            ->groupBy('worker_id')
            ->get()
            ->keyBy('worker_id');

        $applications = $applications
            ->map(fn (JobApplication $application): array => $this->payload(
                $application,
                $user->role === 'client',
                $ratings->get($application->worker_id),
            ))
            ->values();

        return response()->json(['applications' => $applications])
            ->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $worker = $request->user();
        abort_unless($worker->role === 'worker', 403, 'Only worker accounts can apply to jobs.');

        $data = $request->validate([
            'job_id' => ['required', 'integer', 'exists:posted_jobs,id'],
            'resume' => ['required', 'file', 'mimes:pdf,doc,docx', 'extensions:pdf,doc,docx', 'max:4096'],
            'response' => ['nullable', 'string', 'max:2000'],
        ]);
        $job = Job::findOrFail($data['job_id']);
        if ($job->client_id === $worker->id) {
            abort(403, 'You cannot apply to your own job.');
        }
        if ($job->application_method === 'form' && trim((string) ($data['response'] ?? '')) === '') {
            return response()->json(['errors' => ['response' => ['Complete the application response before submitting.']]], 422);
        }
        if (JobApplication::where('job_id', $job->id)->where('worker_id', $worker->id)->exists()) {
            return response()->json(['errors' => ['job_id' => ['You have already applied to this job.']]], 422);
        }

        $file = $data['resume'];
        $path = $file->store('job-resumes/'.$job->id.'/'.$worker->id, 'local');
        if (!$path) {
            throw new \RuntimeException('The resume could not be stored.');
        }

        try {
            $application = JobApplication::create([
                'job_id' => $job->id,
                'worker_id' => $worker->id,
                'status' => 'pending',
                'resume_path' => $path,
                'resume_name' => $file->getClientOriginalName(),
                'resume_mime' => $file->getMimeType() ?: 'application/octet-stream',
                'response' => $data['response'] ?? null,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            if ($exception instanceof QueryException
                && JobApplication::where('job_id', $job->id)->where('worker_id', $worker->id)->exists()) {
                return response()->json(['errors' => ['job_id' => ['You have already applied to this job.']]], 422);
            }
            throw $exception;
        }

        return response()->json(['application' => $this->payload($application->load(['job', 'worker']), false)], 201)
            ->header('Cache-Control', 'private, no-store');
    }

    public function updateStatus(Request $request, JobApplication $application): JsonResponse
    {
        $client = $request->user();
        abort_unless($client->role === 'client' && $application->job()->where('client_id', $client->id)->exists(), 403);

        $data = $request->validate(['status' => ['required', 'in:accepted,rejected']]);
        if ($application->status !== 'pending') {
            abort(409, 'This application has already been reviewed.');
        }

        $application->status = $data['status'];
        $application->save();

        return response()->json(['application' => $this->payload($application->fresh()->load(['job', 'worker']), true)]);
    }

    public function resume(Request $request, JobApplication $application): StreamedResponse
    {
        $user = $request->user();
        $isApplicant = $application->worker_id === $user->id;
        $isHiringClient = $user->role === 'client'
            && $application->job()->where('client_id', $user->id)->exists();
        abort_unless($isApplicant || $isHiringClient, 403);
        abort_unless(Storage::disk('local')->exists($application->resume_path), 404, 'Resume file is no longer available.');

        return Storage::disk('local')->response($application->resume_path, $application->resume_name, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], $isHiringClient ? 'inline' : 'attachment');
    }

    public function rate(Request $request, JobApplication $application): JsonResponse
    {
        $client = $request->user();
        abort_unless($client->role === 'client' && $application->job()->where('client_id', $client->id)->exists(), 403);
        abort_unless($application->status === 'accepted', 409, 'Only an accepted worker can be rated.');

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'rating_comment' => ['nullable', 'string', 'max:1000'],
        ]);
        $application->rating = $data['rating'];
        $application->rating_comment = $data['rating_comment'] ?? null;
        $application->save();

        return response()->json(['application' => $this->payload($application->fresh()->load(['job', 'worker']), true)]);
    }

    private function payload(JobApplication $application, bool $includeWorker, ?object $ratingSummary = null): array
    {
        $worker = $application->worker;

        return [
            'id' => $application->id,
            'jobId' => $application->job_id,
            'title' => $application->job?->title,
            'category' => $application->job?->category,
            'company' => $application->job?->company,
            'submitted' => $application->created_at?->toDateString(),
            'status' => $application->status,
            'resumeName' => $application->resume_name,
            'resumeUrl' => route('applications.resume', ['application' => $application->id]),
            'response' => $application->response,
            'rating' => $application->rating,
            'ratingComment' => $application->rating_comment,
            'workerId' => $application->worker_id,
            'workerName' => $worker->name,
            'clientId' => $application->job?->client_id,
            'clientProfileUrl' => $application->job?->client_id
                ? route('clients.profile', ['client' => $application->job->client_id])
                : null,
            'worker' => $includeWorker ? [
                'id' => $worker->id,
                'name' => $worker->name,
                'title' => $worker->profile_title,
                'skills' => $worker->profile_skills,
                'education' => $worker->profile_education,
                'description' => $worker->profile_description,
                'age' => $worker->birth_date?->age,
                'gender' => $worker->gender,
                'location' => $worker->birthplace,
                'avatarUrl' => $worker->profile_picture_path
                    ? route('workers.avatar', ['user' => $worker->id])
                    : null,
                'ratingAverage' => $ratingSummary?->average ? round((float) $ratingSummary->average, 1) : null,
                'ratingCount' => (int) ($ratingSummary->ratings_count ?? 0),
            ] : null,
        ];
    }
}
