<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/dashboard', function () {
        $user = Auth::user();

        if ($user && $user->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return redirect()->route('visitor.dashboard');
    })->name('dashboard');

    Route::get('/admin/dashboard', function () {
        $user = Auth::user();

        abort_unless(
            $user && $user->role === 'admin',
            403
        );

        return Inertia::render('Admin/Dashboard');
    })->name('admin.dashboard');

    Route::get('/visitor/dashboard', function () {
        return Inertia::render('Visitor/Dashboard');
    })->name('visitor.dashboard');
});

require __DIR__.'/auth.php';
