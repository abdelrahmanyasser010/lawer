<?php
$req = Illuminate\Http\Request::create('/api/v1/catalog', 'GET');
$res = app()->handle($req);
echo $res->getContent();
