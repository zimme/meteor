MongoIdMap = function () {
  var self = this;
  IdMap.call(self, MongoId._idStringify, MongoId._idParse);
};

Meteor._inherits(MongoIdMap, IdMap);
