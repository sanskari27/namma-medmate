package com.nammamedmate.server.application.access;

import java.util.List;

public record AccessRoleCatalog(List<AccessRoleView> roles, List<ModuleCatalogItem> catalog) {}
