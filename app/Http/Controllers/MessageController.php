<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $peerIds = Message::query()
            ->where('sender_id', $user->id)
            ->orWhere('recipient_id', $user->id)
            ->latest('id')
            ->limit(500)
            ->get(['sender_id', 'recipient_id'])
            ->map(fn (Message $message): int => $message->sender_id === $user->id
                ? $message->recipient_id
                : $message->sender_id)
            ->unique()
            ->take(100)
            ->values();

        $conversations = User::query()
            ->whereIn('id', $peerIds)
            ->get(['id', 'name', 'role', 'profile_title'])
            ->map(function (User $peer) use ($user): array {
                $latest = Message::query()
                    ->where(function ($query) use ($user, $peer): void {
                        $query->where('sender_id', $user->id)->where('recipient_id', $peer->id);
                    })
                    ->orWhere(function ($query) use ($user, $peer): void {
                        $query->where('sender_id', $peer->id)->where('recipient_id', $user->id);
                    })
                    ->latest('id')
                    ->first();

                return [
                    'id' => $peer->id,
                    'name' => $peer->name,
                    'role' => $peer->role,
                    'sub' => $peer->profile_title ?: ucfirst($peer->role),
                    'last_message' => $latest?->body,
                    'last_message_at' => $latest?->created_at?->toIso8601String(),
                    'unread_count' => Message::query()
                        ->where('sender_id', $peer->id)
                        ->where('recipient_id', $user->id)
                        ->whereNull('read_at')
                        ->count(),
                ];
            })
            ->sortByDesc('last_message_at')
            ->values();

        return response()->json(['conversations' => $conversations])
            ->header('Cache-Control', 'private, no-store');
    }

    public function conversation(Request $request, User $user): JsonResponse
    {
        $current = $request->user();
        $this->ensureContactable($current, $user);

        Message::query()
            ->where('sender_id', $user->id)
            ->where('recipient_id', $current->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = Message::query()
            ->where(function ($query) use ($current, $user): void {
                $query->where('sender_id', $current->id)->where('recipient_id', $user->id);
            })
            ->orWhere(function ($query) use ($current, $user): void {
                $query->where('sender_id', $user->id)->where('recipient_id', $current->id);
            })
            ->oldest('id')
            ->limit(200)
            ->get()
            ->map(fn (Message $message): array => $this->messagePayload($message, $current->id))
            ->values();

        return response()->json([
            'contact' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'sub' => $user->profile_title ?: ucfirst($user->role),
            ],
            'messages' => $messages,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $current = $request->user();
        $data = $request->validate([
            'recipient_id' => ['required', 'integer', 'exists:users,id'],
            'body' => ['required', 'string', 'max:2000'],
        ]);
        $recipient = User::findOrFail($data['recipient_id']);
        $this->ensureContactable($current, $recipient);

        $message = Message::create([
            'sender_id' => $current->id,
            'recipient_id' => $recipient->id,
            'body' => trim($data['body']),
        ]);

        return response()->json(['message' => $this->messagePayload($message, $current->id)], 201);
    }

    private function ensureContactable(User $current, User $peer): void
    {
        abort_unless(
            in_array($current->role, ['client', 'worker'], true)
                && in_array($peer->role, ['client', 'worker'], true)
                && $current->role !== $peer->role
                && $current->id !== $peer->id,
            403,
            'Messages can only be exchanged between client and worker accounts.'
        );
    }

    private function messagePayload(Message $message, int $currentUserId): array
    {
        return [
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'recipient_id' => $message->recipient_id,
            'body' => $message->body,
            'mine' => $message->sender_id === $currentUserId,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
