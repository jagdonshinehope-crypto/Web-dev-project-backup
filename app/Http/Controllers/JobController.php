<?php

namespace App\Http\Controllers;

use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $jobs = Job::query()
            ->with('client:id,name')
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Job $job): array => $this->payload($job))
            ->values();

        return response()->json(['jobs' => $jobs])
            ->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $client = $request->user();
        abort_unless($client->role === 'client', 403, 'Only client accounts can post jobs.');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', 'max:120'],
            'location' => ['required', 'string', 'max:120'],
            'type' => ['required', 'in:fulltime,parttime,gig'],
            'salary' => ['required', 'string', 'max:80'],
            'description' => ['required', 'string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:12'],
            'tags.*' => ['string', 'max:60'],
            'application_instructions' => ['nullable', 'string', 'max:1000'],
            'application_method' => ['required', 'in:direct,form'],
            'application_question' => ['nullable', 'required_if:application_method,form', 'string', 'max:500'],
        ]);

        $job = Job::create([
            ...$data,
            'client_id' => $client->id,
            'company' => $client->name,
        ])->load('client:id,name');

        return response()->json(['job' => $this->payload($job)], 201);
    }

    private function payload(Job $job): array
    {
        return [
            'id' => $job->id,
            'cat' => $job->category,
            'title' => $job->title,
            'company' => $job->company,
            'postedBy' => $job->client?->name,
            'ownerId' => $job->client_id,
            'clientProfileUrl' => route('clients.profile', ['client' => $job->client_id]),
            'place' => $job->location,
            'type' => $job->type,
            'salary' => $job->salary,
            'budget' => $job->salary,
            'match' => 90,
            'tags' => $job->tags ?? [],
            'desc' => $job->description,
            'overview' => $job->description,
            'applicationInstructions' => $job->application_instructions ?: 'Submit your resume through FlexWork to apply.',
            'applicationMethod' => $job->application_method,
            'applicationQuestion' => $job->application_question,
            'createdAt' => $job->created_at?->toIso8601String(),
        ];
    }
}
