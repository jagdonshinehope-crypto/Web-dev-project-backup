<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posted_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 120);
            $table->string('category', 120);
            $table->string('location', 120);
            $table->string('type', 20);
            $table->string('salary', 80);
            $table->string('company', 255);
            $table->text('description');
            $table->json('tags')->nullable();
            $table->text('application_instructions')->nullable();
            $table->string('application_method', 20)->default('direct');
            $table->string('application_question', 500)->nullable();
            $table->timestamps();

            $table->index(['category', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posted_jobs');
    }
};
