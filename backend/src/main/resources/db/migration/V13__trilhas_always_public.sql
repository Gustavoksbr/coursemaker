-- Trilhas never got a password gate (unlike courses), so "private" was a UI option that did
-- nothing: canView only ever checked status/ownership, never visibility. The application no
-- longer offers the private choice; this normalizes any trilha that was already marked private
-- so the column matches reality going forward.
UPDATE trilhas SET visibility = 'public' WHERE visibility = 'private';
