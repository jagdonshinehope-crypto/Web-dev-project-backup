<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WorkerDirectoryController;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->name('auth.register');
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::get('/me', [AuthController::class, 'current'])->name('auth.current');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('auth.password.email');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('auth.password.update');
    Route::get('/google', [AuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/google/callback', [AuthController::class, 'googleCallback'])->name('auth.google.callback');
});

Route::get('/password/reset/{token}', fn () => view('welcome'))->name('password.reset');

Route::middleware('auth')->group(function (): void {
    Route::post('/feedback', [FeedbackController::class, 'store'])->name('feedback.store');
    Route::get('/jobs', [JobController::class, 'index'])->name('jobs.index');
    Route::post('/jobs', [JobController::class, 'store'])->name('jobs.store');
    Route::get('/applications', [JobApplicationController::class, 'index'])->name('applications.index');
    Route::post('/applications', [JobApplicationController::class, 'store'])->name('applications.store');
    Route::patch('/applications/{application}/status', [JobApplicationController::class, 'updateStatus'])->name('applications.status');
    Route::get('/applications/{application}/resume', [JobApplicationController::class, 'resume'])->name('applications.resume');
    Route::put('/applications/{application}/rating', [JobApplicationController::class, 'rate'])->name('applications.rating');
    Route::get('/messages', [MessageController::class, 'index'])->name('messages.index');
    Route::get('/messages/{user}', [MessageController::class, 'conversation'])->name('messages.conversation');
    Route::post('/messages', [MessageController::class, 'store'])->name('messages.store');
    Route::get('/workers', [WorkerDirectoryController::class, 'index'])->name('workers.index');
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])->name('profile.avatar.upload');
    Route::get('/profile/verification', [ProfileController::class, 'verification'])->name('profile.verification');
    Route::post('/profile/verification', [ProfileController::class, 'uploadVerification'])->name('profile.verification.upload');
    Route::get('/clients/{client}/profile', [ProfileController::class, 'clientProfile'])->name('clients.profile');
    Route::get('/clients/{client}/id-proof', [ProfileController::class, 'clientIdProof'])->name('clients.id-proof');
});

Route::get('/workers/{user}/avatar', [WorkerDirectoryController::class, 'avatar'])->name('workers.avatar');
Route::get('/profile/avatar', [ProfileController::class, 'avatar'])->name('profile.avatar');
