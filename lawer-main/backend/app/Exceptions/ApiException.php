<?php
namespace App\Exceptions;
use RuntimeException;
final class ApiException extends RuntimeException
{
    public function __construct(public readonly int $status, string $message, public readonly string $errorCode = 'REQUEST_FAILED', public readonly mixed $details = null)
    {
        parent::__construct($message);
    }
}
