<?php
use Illuminate\Support\Facades\Schedule;
Schedule::command('zdraft:process-outbox --limit=50')->everyMinute()->withoutOverlapping();
Schedule::command('zdraft:process-documents --limit=3')->everyMinute()->withoutOverlapping();
Schedule::command('zdraft:finalize-expired-contracts --limit=50')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('zdraft:cleanup-uploads --hours=24')->hourly()->withoutOverlapping();
Schedule::command('zdraft:backup')->dailyAt('02:30')->withoutOverlapping();
