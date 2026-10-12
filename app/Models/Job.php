<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Job extends Model
{
    protected $table = 'posted_jobs';

    protected $fillable = [
        'client_id',
        'title',
        'category',
        'location',
        'type',
        'salary',
        'company',
        'description',
        'tags',
        'application_instructions',
        'application_method',
        'application_question',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }
}
