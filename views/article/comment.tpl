<a class="pull-left media-profile"<%- user.profile_url ? ' href="' + user.profile_url + '"' : '' %>>
  <% if (user.avatar) { %>
  <img class="media-object" src="<%- user.avatar %>" width="64" height="64">
  <% } else { %>
  <span class="glyphicon glyphicon-user text-muted"></span>
  <% } %>
</a>
<div class="media-body">
  <div class="media-heading text-muted">
    <a<%- user.profile_url ? ' href="' + user.profile_url + '"' : '' %>><%- user.fullname || 'unknown' %></a>
    <%= str_create_time %>
  </div>
  <div><%= html %></div>
</div>