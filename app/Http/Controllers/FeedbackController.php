<?php

namespace App\Http\Controllers;

use App\Models\FeedbackEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'in:general,issue,suggestion'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $feedback = FeedbackEntry::create([
            ...$data,
            'message' => trim($data['message']),
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'id' => $feedback->id,
            'message' => 'Thank you for your feedback.',
        ], 201);
    }
}
