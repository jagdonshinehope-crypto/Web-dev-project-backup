<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_title', 120)->nullable();
            $table->string('profile_skills', 500)->nullable();
            $table->string('profile_education', 500)->nullable();
            $table->text('profile_description')->nullable();
            $table->string('verification_document_path')->nullable();
            $table->string('verification_status', 24)->nullable();
            $table->timestamp('verification_submitted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'profile_title',
                'profile_skills',
                'profile_education',
                'profile_description',
                'verification_document_path',
                'verification_status',
                'verification_submitted_at',
            ]);
        });
    }
};
