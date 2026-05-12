-- Migration: raise html-artifacts bucket file size limit from 5 MB to 6 MB.

update storage.buckets
set file_size_limit = 6291456
where id = 'html-artifacts';
