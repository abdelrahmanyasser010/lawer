<?php

declare(strict_types=1);

if ($argc < 2) {
    fwrite(STDERR, "Usage: php tools/run_python.php <script.py> [args...]\n");
    exit(2);
}

$script = $argv[1];
$args = array_slice($argv, 2);

$candidates = [];
$env = getenv('PYTHON_BIN');
if (is_string($env) && trim($env) !== '') {
    $candidates[] = [trim($env)];
}
$candidates[] = ['python3'];
$candidates[] = ['python'];
if (PHP_OS_FAMILY === 'Windows') {
    $candidates[] = ['py', '-3'];
}

foreach ($candidates as $candidate) {
    if (run(array_merge($candidate, ['--version']), true) !== 0) {
        continue;
    }

    exit(run(array_merge($candidate, [$script], $args), false));
}

fwrite(STDERR, "Could not find a working Python interpreter. Set PYTHON_BIN to an absolute Python path.\n");
exit(127);

function run(array $command, bool $quiet): int
{
    $descriptorSpec = [
        0 => STDIN,
        1 => $quiet ? ['pipe', 'w'] : STDOUT,
        2 => $quiet ? ['pipe', 'w'] : STDERR,
    ];

    $process = @proc_open($command, $descriptorSpec, $pipes);
    if (!is_resource($process)) {
        return 127;
    }

    if ($quiet) {
        foreach ($pipes as $pipe) {
            if (is_resource($pipe)) {
                fclose($pipe);
            }
        }
    }

    $status = proc_close($process);
    return is_int($status) ? $status : 1;
}
