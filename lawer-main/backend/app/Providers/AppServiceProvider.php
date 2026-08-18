<?php
namespace App\Providers;
use Illuminate\Support\ServiceProvider;
final class AppServiceProvider extends ServiceProvider
{
    public function register():void{}
    public function boot():void{date_default_timezone_set((string)config('app.timezone','Africa/Cairo'));}
}
