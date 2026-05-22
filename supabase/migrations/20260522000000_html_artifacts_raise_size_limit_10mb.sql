-- Migration: raise html-artifacts bucket file size limit from 6 MB to 10 MB.

update storage.buckets
set file_size_limit = 10485760
where id = 'html-artifacts';
