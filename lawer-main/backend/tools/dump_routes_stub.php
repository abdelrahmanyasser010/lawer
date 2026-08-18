<?php
namespace Illuminate\Support\Facades {
    final class CapturedRoute {
        public function __construct(public string $method, public string $uri) {}
        public function middleware(...$args): self { return $this; }
        public function whereNumber(...$args): self { return $this; }
        public function where(...$args): self { return $this; }
        public function name(...$args): self { return $this; }
    }
    final class RouteRegistrar {
        public function __construct(private ?string $prefix = null) {}
        public function middleware(...$args): self { return $this; }
        public function prefix(string $prefix): self { return new self(Route::join($this->prefix, $prefix)); }
        public function group(callable $callback): void { Route::pushPrefix($this->prefix); $callback(); Route::popPrefix(); }
        public function __call(string $name, array $args): mixed { return Route::$name(...$args); }
    }
    final class Route {
        public static array $routes = [];
        private static array $prefixes = [];
        public static function prefix(string $prefix): RouteRegistrar { return new RouteRegistrar($prefix); }
        public static function middleware(...$args): RouteRegistrar { return new RouteRegistrar(); }
        public static function pushPrefix(?string $prefix): void { self::$prefixes[] = $prefix ?? ''; }
        public static function popPrefix(): void { array_pop(self::$prefixes); }
        public static function join(?string ...$parts): string {
            $clean = array_values(array_filter(array_map(fn($p) => trim((string)$p, '/'), $parts), fn($p) => $p !== ''));
            return implode('/', $clean);
        }
        private static function add(string $method, string $uri): CapturedRoute {
            $full = self::join(...array_merge(self::$prefixes, [$uri]));
            $route = new CapturedRoute(strtoupper($method), '/api/' . $full);
            self::$routes[] = $route;
            return $route;
        }
        public static function get(string $uri, mixed $action): CapturedRoute { return self::add('GET',$uri); }
        public static function post(string $uri, mixed $action): CapturedRoute { return self::add('POST',$uri); }
        public static function put(string $uri, mixed $action): CapturedRoute { return self::add('PUT',$uri); }
        public static function patch(string $uri, mixed $action): CapturedRoute { return self::add('PATCH',$uri); }
        public static function delete(string $uri, mixed $action): CapturedRoute { return self::add('DELETE',$uri); }
        public static function options(string $uri, mixed $action): CapturedRoute { return self::add('OPTIONS',$uri); }
    }
}
namespace {
    require dirname(__DIR__) . '/routes/api.php';
    $rows = array_map(fn($r) => ['method'=>$r->method,'path'=>$r->uri], \Illuminate\Support\Facades\Route::$routes);
    echo json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), "\n";
}
